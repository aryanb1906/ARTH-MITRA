"""
Arth-Mitra AI Bot - RAG-based financial assistant
Uses LangChain + OpenRouter + ChromaDB for document retrieval and response generation
"""

import os
import re
import glob
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, CSVLoader, TextLoader
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

# Configuration
CHROMA_PERSIST_DIR = "./chroma_db"
DOCS_DIR = "./documents"  # Pre-loaded knowledge base documents
GOLD_DATA_PATH = os.path.join(DOCS_DIR, "gold_data.csv")

# Month name mappings for date parsing
MONTH_NAMES = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12
}


def parse_date_from_query(query: str) -> Optional[datetime]:
    """
    Parse various date formats from a query string.
    Supports: DD/MM/YYYY, DD-MM-YYYY, "25th December 2020", "December 25, 2020", etc.
    Returns datetime object or None if no date found.
    """
    query_lower = query.lower()
    
    # Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    pattern1 = r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})'
    match = re.search(pattern1, query)
    if match:
        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return datetime(year, month, day)
        except ValueError:
            pass
    
    # Pattern 2: "25th December 2020", "25 December 2020", "25th Dec 2020"
    pattern2 = r'(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})'
    match = re.search(pattern2, query_lower)
    if match:
        day = int(match.group(1))
        month_name = match.group(2)
        year = int(match.group(3))
        month = MONTH_NAMES.get(month_name)
        if month:
            try:
                return datetime(year, month, day)
            except ValueError:
                pass
    
    # Pattern 3: "December 25, 2020" or "Dec 25 2020"
    pattern3 = r'([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})'
    match = re.search(pattern3, query_lower)
    if match:
        month_name = match.group(1)
        day = int(match.group(2))
        year = int(match.group(3))
        month = MONTH_NAMES.get(month_name)
        if month:
            try:
                return datetime(year, month, day)
            except ValueError:
                pass
    
    # Pattern 4: YYYY/MM/DD or YYYY-MM-DD
    pattern4 = r'(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})'
    match = re.search(pattern4, query)
    if match:
        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return datetime(year, month, day)
        except ValueError:
            pass
    
    return None


def is_gold_price_query(query: str) -> bool:
    """Check if the query is asking about gold prices."""
    query_lower = query.lower()
    gold_keywords = ['gold', 'sona', 'sonay', 'gold price', 'gold rate', 'gold ki price', 'gold ka rate']
    date_present = parse_date_from_query(query) is not None
    
    for keyword in gold_keywords:
        if keyword in query_lower and date_present:
            return True
    return False


class GoldPriceLookup:
    """Direct CSV lookup for gold prices by date."""
    
    def __init__(self, csv_path: str = GOLD_DATA_PATH):
        self.csv_path = csv_path
        self.df = None
        self._load_data()
    
    def _load_data(self):
        """Load and parse the gold data CSV."""
        if os.path.exists(self.csv_path):
            try:
                self.df = pd.read_csv(self.csv_path)
                # Parse dates - format is DD/MM/YYYY
                self.df['ParsedDate'] = pd.to_datetime(
                    self.df['Date'], 
                    format='%d/%m/%Y', 
                    errors='coerce'
                )
                self.df = self.df.dropna(subset=['ParsedDate'])
                self.df = self.df.sort_values('ParsedDate')
            except Exception as e:
                print(f"Error loading gold data: {e}")
                self.df = None
    
    def get_price(self, date: datetime) -> Optional[Dict]:
        """Get gold price for exact date."""
        if self.df is None:
            return None
        
        target_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        result = self.df[self.df['ParsedDate'] == target_date]
        
        if not result.empty:
            row = result.iloc[0]
            return {
                'date': row['Date'],
                'price': row['Price'],
                'open': row['Open'],
                'high': row['High'],
                'low': row['Low'],
                'volume': row.get('Volume', 'N/A'),
                'found': True
            }
        return None
    
    def get_nearest_price(self, date: datetime, max_days: int = 7) -> Tuple[Optional[Dict], str]:
        """
        Get nearest available price if exact date not found.
        Returns (price_data, explanation_string)
        """
        if self.df is None:
            return None, "Gold price data not available."
        
        target_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Check for exact match first
        exact = self.get_price(date)
        if exact:
            return exact, f"Exact date found"
        
        # Find nearest dates (before and after)
        before = self.df[self.df['ParsedDate'] < target_date].tail(1)
        after = self.df[self.df['ParsedDate'] > target_date].head(1)
        
        nearest = None
        direction = ""
        
        if not before.empty and not after.empty:
            before_diff = abs((target_date - before.iloc[0]['ParsedDate']).days)
            after_diff = abs((after.iloc[0]['ParsedDate'] - target_date).days)
            
            if before_diff <= after_diff and before_diff <= max_days:
                nearest = before.iloc[0]
                direction = "before"
            elif after_diff <= max_days:
                nearest = after.iloc[0]
                direction = "after"
        elif not before.empty:
            before_diff = abs((target_date - before.iloc[0]['ParsedDate']).days)
            if before_diff <= max_days:
                nearest = before.iloc[0]
                direction = "before"
        elif not after.empty:
            after_diff = abs((after.iloc[0]['ParsedDate'] - target_date).days)
            if after_diff <= max_days:
                nearest = after.iloc[0]
                direction = "after"
        
        if nearest is not None:
            return {
                'date': nearest['Date'],
                'price': nearest['Price'],
                'open': nearest['Open'],
                'high': nearest['High'],
                'low': nearest['Low'],
                'volume': nearest.get('Volume', 'N/A'),
                'found': False,
                'nearest': True
            }, f"Data not available for requested date (possibly a holiday/weekend). Nearest available date ({direction})"
        
        return None, "No gold price data available within the date range."
    
    def get_date_range(self) -> Tuple[Optional[str], Optional[str]]:
        """Get the available date range in the data."""
        if self.df is None or self.df.empty:
            return None, None
        return self.df['Date'].iloc[0], self.df['Date'].iloc[-1]


# Global gold lookup instance
_gold_lookup: Optional[GoldPriceLookup] = None


def get_gold_lookup() -> GoldPriceLookup:
    """Get or create gold lookup singleton."""
    global _gold_lookup
    if _gold_lookup is None:
        _gold_lookup = GoldPriceLookup()
    return _gold_lookup


def format_user_profile(profile: Dict) -> str:
    """Format user profile information for the system prompt."""
    if not profile:
        return ""
    
    profile_text = "**USER PROFILE** (Provide personalized recommendations based on this information):\n"
    
    # Compulsory fields
    profile_text += f"- **Age**: {profile.get('age', 'Not specified')}"
    if profile.get('age', 0) >= 60:
        profile_text += " (Senior Citizen - eligible for senior citizen schemes)"
    elif profile.get('age', 0) >= 55:
        profile_text += " (Near retirement age)"
    profile_text += "\n"
    
    profile_text += f"- **Annual Income**: {profile.get('income', 'Not specified')}\n"
    profile_text += f"- **Employment Status**: {profile.get('employmentStatus', 'Not specified')}\n"
    
    # Add specific notes based on employment
    emp_status = profile.get('employmentStatus', '')
    if 'Government' in emp_status:
        profile_text += "  (Note: Higher NPS employer contribution limit - 14% of salary)\n"
    elif 'Retired' in emp_status:
        profile_text += "  (Note: Focus on senior citizen schemes like SCSS, PMVVY)\n"
    
    profile_text += f"- **Tax Regime**: {profile.get('taxRegime', 'Not specified')}\n"
    if profile.get('taxRegime') == 'Old Regime':
        profile_text += "  (Note: Eligible for 80C, 80D, and other deductions)\n"
    elif profile.get('taxRegime') == 'New Regime':
        profile_text += "  (Note: Limited deductions - only NPS employer contribution, no 80C/80D)\n"
    
    profile_text += f"- **Housing Status**: {profile.get('homeownerStatus', 'Not specified')}\n"
    if 'Loan' in profile.get('homeownerStatus', ''):
        profile_text += "  (Note: Eligible for home loan interest deduction - Section 24)\n"
    elif 'Rented' in profile.get('homeownerStatus', ''):
        profile_text += "  (Note: May be eligible for HRA exemption if salaried)\n"
    
    # Optional fields (only show if provided)
    if profile.get('children'):
        profile_text += f"- **Children**: {profile.get('children')}"
        if profile.get('childrenAges'):
            profile_text += f" (Ages: {profile.get('childrenAges')})"
            # Check for girl child under 10
            try:
                ages = [int(age.strip()) for age in profile.get('childrenAges', '').split(',') if age.strip()]
                if any(age < 10 for age in ages):
                    profile_text += " - Eligible for Sukanya Samriddhi Yojana if girl child"
            except:
                pass
        profile_text += "\n"
    
    if profile.get('parentsAge'):
        profile_text += f"- **Parents Age**: {profile.get('parentsAge')}\n"
        # Check if parents are senior citizens
        if '60' in str(profile.get('parentsAge', '')) or '65' in str(profile.get('parentsAge', '')):
            profile_text += "  (Note: Additional 80D deduction for senior citizen parents - ₹50,000)\n"
    
    if profile.get('investmentCapacity'):
        profile_text += f"- **Investment Capacity**: {profile.get('investmentCapacity')}\n"
    
    if profile.get('riskAppetite'):
        profile_text += f"- **Risk Appetite**: {profile.get('riskAppetite')}\n"
        if profile.get('riskAppetite') == 'Conservative':
            profile_text += "  (Note: Recommend fixed-return instruments like PPF, NSC, SCSS)\n"
        elif profile.get('riskAppetite') == 'Aggressive':
            profile_text += "  (Note: Can suggest ELSS, NPS equity allocation, market-linked returns)\n"
    
    profile_text += "\n"
    return profile_text


# System prompt for financial guidance
SYSTEM_PROMPT = """You are Arth-Mitra, an expert AI financial advisor specializing in Indian finance.
You help users understand:
- Income Tax laws and optimization strategies
- Government schemes (NPS, PPF, SSY, APY, etc.)
- Investment options and their tax implications
- Retirement planning and pension schemes

{user_profile}

Guidelines for your responses:
1. **Structure**: Use clear sections with headers (##) when explaining complex topics
2. **Formatting**: Use **bold** for important terms, numbers, and deadlines
3. **Tables**: Present comparative data in markdown tables when applicable
4. **Lists**: Use bullet points (- or *) or numbered lists (1., 2., etc.) for steps or options
5. **Actionable**: Provide specific numbers, amounts, and eligibility criteria
6. **Simple Language**: Explain complex financial terms in simple Hindi/English
7. **Cite Sources**: Reference specific sections, acts, or documents from the context
8. **Personalized**: Use the user's profile information to provide tailored recommendations
9. **Honesty**: If the answer is NOT in the provided context, clearly state "I don't have specific information about this in my knowledge base"

Response Format Example:
## [Topic Name]

[Brief introduction]

### Key Features
- **Feature 1**: Detail
- **Feature 2**: Detail

### Eligibility
| Criteria | Requirement |
|----------|-------------|
| Age | X-Y years |
| Income | ₹X Lakhs |

### Tax Benefits
[Explain with specific sections like 80C, 80D etc.]

### How to Apply
1. Step one
2. Step two

---
*Source: [Document name from context]*

Context from knowledge base:
{context}

User Question: {question}

Provide a helpful, detailed, well-formatted response based on the context above:"""

PROMPT_TEMPLATE = ChatPromptTemplate.from_template(SYSTEM_PROMPT)


class ArthMitraBot:
    """RAG-based financial assistant bot"""
    
    def __init__(self):
        self.embeddings = None
        self.vectorstore = None
        self.rag_chain = None
        self.llm = None
        self._initialized = False
        self._retriever = None
        self._indexed_files = set()
    
    def initialize(self, auto_index: bool = True):
        """Initialize the bot with embeddings and LLM"""
        # Check for Gemini API key first (preferred), then OpenRouter
        gemini_key = os.getenv("GEMINI_API_KEY")
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        
        if not gemini_key and not openrouter_key:
            raise ValueError(
                "No API key found. Set either GEMINI_API_KEY or OPENROUTER_API_KEY in .env file.\n"
                "Gemini is recommended for better performance."
            )
        
        # Initialize embeddings (HuggingFace - runs locally, free)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Initialize LLM - Prefer Gemini if available
        if gemini_key:
            print("🤖 Using Google Gemini AI (gemini-1.5-flash)")
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=0.3,
                google_api_key=gemini_key,
                convert_system_message_to_human=True  # Gemini doesn't support system messages
            )
        else:
            print("🤖 Using OpenRouter AI (gpt-4o-mini)")
            self.llm = ChatOpenAI(
                model="openai/gpt-4o-mini",
                temperature=0.3,
                openai_api_key=openrouter_key,
                openai_api_base="https://openrouter.ai/api/v1",
            )

        
        # Load or create vector store
        if os.path.exists(CHROMA_PERSIST_DIR):
            self.vectorstore = Chroma(
                persist_directory=CHROMA_PERSIST_DIR,
                embedding_function=self.embeddings
            )
        else:
            # Create empty vectorstore if no documents indexed yet
            os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
            self.vectorstore = Chroma(
                persist_directory=CHROMA_PERSIST_DIR,
                embedding_function=self.embeddings
            )
        
        self._initialized = True
        
        # Auto-index documents from knowledge base folder
        if auto_index:
            self._auto_index_documents()
        
        # Create RAG chain
        self._create_rag_chain()
        
        return self
    
    def _auto_index_documents(self):
        """Auto-index all documents from the documents folder"""
        if not os.path.exists(DOCS_DIR):
            os.makedirs(DOCS_DIR, exist_ok=True)
            print(f"📁 Created {DOCS_DIR} folder. Add PDF/CSV/TXT files here for RAG.")
            return
        
        # Get all supported files
        supported_extensions = ['*.pdf', '*.csv', '*.txt', '*.md']
        files_to_index = []
        
        for ext in supported_extensions:
            files_to_index.extend(glob.glob(os.path.join(DOCS_DIR, '**', ext), recursive=True))
        
        if not files_to_index:
            print(f"📭 No documents found in {DOCS_DIR}. Add PDF/CSV/TXT files for knowledge base.")
            return
        
        # Check which files are already indexed (by checking metadata)
        try:
            existing_sources = set()
            if self.vectorstore._collection.count() > 0:
                results = self.vectorstore.get(include=['metadatas'])
                for meta in results.get('metadatas', []):
                    if meta and 'source' in meta:
                        existing_sources.add(os.path.basename(meta['source']))
        except:
            existing_sources = set()
        
        # Index new files
        new_files = [f for f in files_to_index if os.path.basename(f) not in existing_sources]
        
        if new_files:
            print(f"📚 Indexing {len(new_files)} new document(s)...")
            for file_path in new_files:
                try:
                    result = self.add_documents(file_path)
                    print(f"  ✓ {result['message']}")
                except Exception as e:
                    print(f"  ✗ Failed to index {os.path.basename(file_path)}: {e}")
        else:
            print(f"✓ Knowledge base up to date ({len(existing_sources)} documents indexed)")
    
    def _format_docs(self, docs):
        """Format retrieved documents into a string with source info"""
        formatted = []
        for doc in docs:
            source = doc.metadata.get('source', 'Unknown')
            page = doc.metadata.get('page', '')
            source_info = f"[Source: {os.path.basename(source)}"
            if page:
                source_info += f", Page {page + 1}"
            source_info += "]"
            formatted.append(f"{doc.page_content}\n{source_info}")
        return "\n\n---\n\n".join(formatted)
    
    def _create_rag_chain(self):
        """Create the RAG chain using LCEL"""
        try:
            doc_count = self.vectorstore._collection.count()
        except:
            doc_count = 0
            
        if doc_count > 0:
            self._retriever = self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}
            )
            
            self.rag_chain = (
                {"context": self._retriever | self._format_docs, "question": RunnablePassthrough()}
                | PROMPT_TEMPLATE
                | self.llm
                | StrOutputParser()
            )
    
    def add_documents(self, file_path: str) -> Dict:
        """Add documents to the knowledge base"""
        if not self._initialized:
            raise RuntimeError("Bot not initialized. Call initialize() first.")
        
        # Determine loader based on file type
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == ".pdf":
            loader = PyPDFLoader(file_path)
        elif file_ext == ".csv":
            loader = CSVLoader(file_path)
        elif file_ext in [".txt", ".md"]:
            loader = TextLoader(file_path)
        else:
            return {"status": "error", "message": f"Unsupported file type: {file_ext}"}
        
        # Load and split documents
        documents = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " "]
        )
        
        splits = text_splitter.split_documents(documents)
        
        # Add to vector store
        self.vectorstore.add_documents(splits)
        
        # Recreate RAG chain with updated vectorstore
        self._create_rag_chain()
        
        return {
            "status": "success",
            "message": f"Indexed {len(splits)} chunks from {os.path.basename(file_path)}"
        }
    
    def _extract_text(self, content) -> str:
        """Extract text from LLM response content"""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            # Handle Gemini's list format
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'text':
                    return item.get('text', '')
                if isinstance(item, str):
                    return item
            return str(content)
        return str(content)
    
    def _handle_gold_price_query(self, query: str) -> Optional[Dict]:
        """
        Handle gold price queries with direct CSV lookup.
        Returns formatted response if this is a gold query, None otherwise.
        """
        # Parse date from the query
        parsed_date = parse_date_from_query(query)
        if not parsed_date:
            return None
        
        # Check if query mentions gold
        query_lower = query.lower()
        gold_keywords = ['gold', 'sona', 'sonay', 'gold price', 'gold rate', 'gold ki', 'gold ka']
        is_gold_query = any(kw in query_lower for kw in gold_keywords)
        
        if not is_gold_query:
            return None
        
        # Get gold price lookup
        gold_lookup = get_gold_lookup()
        
        # Format the requested date for display
        requested_date_str = parsed_date.strftime("%d/%m/%Y")
        requested_date_readable = parsed_date.strftime("%d %B %Y")
        
        # Try to get exact price
        price_data = gold_lookup.get_price(parsed_date)
        
        if price_data:
            response = f"""Namaste! I am Arth-Mitra, your AI financial advisor.

Here is the gold price data for **{requested_date_readable}**:

| Metric | Value |
|--------|-------|
| **Date** | {price_data['date']} |
| **Price** | ${price_data['price']:.2f} |
| **Open** | ${price_data['open']:.2f} |
| **High** | ${price_data['high']:.2f} |
| **Low** | ${price_data['low']:.2f} |
| **Volume** | {price_data['volume']} |

*Note: Prices are in USD per troy ounce.*

If you have any questions about investing in gold (like Sovereign Gold Bonds, Gold ETFs, or physical gold) or their tax implications, feel free to ask!"""
            
            return {
                "response": response,
                "sources": ["gold_data.csv"]
            }
        
        # Try to get nearest price if exact not found
        nearest_data, explanation = gold_lookup.get_nearest_price(parsed_date)
        
        if nearest_data:
            response = f"""Namaste! I am Arth-Mitra, your AI financial advisor.

I don't have gold price data for **{requested_date_readable}** (this may be a holiday or weekend when markets were closed).

{explanation}: **{nearest_data['date']}**

| Metric | Value |
|--------|-------|
| **Date** | {nearest_data['date']} |
| **Price** | ${nearest_data['price']:.2f} |
| **Open** | ${nearest_data['open']:.2f} |
| **High** | ${nearest_data['high']:.2f} |
| **Low** | ${nearest_data['low']:.2f} |
| **Volume** | {nearest_data['volume']} |

*Note: Prices are in USD per troy ounce.*

If you need information about gold investment options available in India, such as Sovereign Gold Bonds (SGB), Gold ETFs, or Digital Gold, I'd be happy to help!"""
            
            return {
                "response": response,
                "sources": ["gold_data.csv"]
            }
        
        # No data available at all
        date_range = gold_lookup.get_date_range()
        range_info = ""
        if date_range[0] and date_range[1]:
            range_info = f" The available data ranges from {date_range[0]} to {date_range[1]}."
        
        response = f"""Namaste! I am Arth-Mitra, your AI financial advisor.

I don't have gold price data for **{requested_date_readable}**.{range_info}

If you have questions about current gold investment options in India or tax implications of gold investments, I would be happy to assist!"""
        
        return {
            "response": response,
            "sources": ["gold_data.csv"]
        }
    
    def get_response(self, query: str, profile: Optional[Dict] = None) -> Dict:
        """Get AI response for a user query"""
        if not self._initialized:
            raise RuntimeError("Bot not initialized. Call initialize() first.")
        
        # Check if this is a gold price query with a specific date
        gold_response = self._handle_gold_price_query(query)
        if gold_response:
            return gold_response
        
        # Format user profile for context
        user_profile_text = format_user_profile(profile) if profile else ""
        
        # Check document count
        try:
            doc_count = self.vectorstore._collection.count()
        except:
            doc_count = 0
        
        # If no documents indexed, use direct LLM response
        if self.rag_chain is None or doc_count == 0:
            prompt = SYSTEM_PROMPT.replace("{user_profile}", user_profile_text).replace("{context}", "No specific documents available.").replace("{question}", query)
            response = self.llm.invoke(prompt)
            return {
                "response": self._extract_text(response.content),
                "sources": ["General Knowledge - No documents indexed yet"]
            }
        
        # Get source documents for citation
        source_docs = self._retriever.invoke(query)
        
        # Create a custom prompt with profile
        context = "\n\n".join([doc.page_content for doc in source_docs])
        prompt = SYSTEM_PROMPT.replace("{user_profile}", user_profile_text).replace("{context}", context).replace("{question}", query)
        
        # Use LLM directly with the customized prompt
        response = self.llm.invoke(prompt)
        result = self._extract_text(response.content)
        
        # Extract sources
        sources = []
        for doc in source_docs:
            source = doc.metadata.get("source", "Unknown")
            page = doc.metadata.get("page", "")
            source_str = f"{os.path.basename(source)}"
            if page:
                source_str += f" (Page {page + 1})"
            if source_str not in sources:
                sources.append(source_str)
        
        return {
            "response": result,
            "sources": sources if sources else ["Knowledge Base"]
        }
    
    def get_status(self) -> Dict:
        """Get bot status and statistics"""
        doc_count = 0
        if self.vectorstore:
            try:
                doc_count = self.vectorstore._collection.count()
            except:
                doc_count = 0
        
        # Determine which AI model is being used
        model_name = None
        if self.llm:
            if isinstance(self.llm, ChatGoogleGenerativeAI):
                model_name = "Google Gemini (gemini-1.5-flash)"
            else:
                model_name = "OpenRouter (gpt-4o-mini)"
        
        return {
            "initialized": self._initialized,
            "documents_indexed": doc_count,
            "model": model_name
        }


# Singleton instance
_bot_instance: Optional[ArthMitraBot] = None


def get_bot() -> ArthMitraBot:
    """Get or create bot singleton"""
    global _bot_instance
    if _bot_instance is None:
        _bot_instance = ArthMitraBot()
    return _bot_instance


def initialize_bot(api_key: Optional[str] = None) -> ArthMitraBot:
    """Initialize and return the bot"""
    bot = get_bot()
    if not bot._initialized:
        bot.initialize()
    return bot
