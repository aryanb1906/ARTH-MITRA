#include<bits/stdc++.h>

using namespace std ;

#define ll long long
#define nline '\n' 
#define FOR vector<int>v(n) ;for(int i = 0 ;i < n ; i++) cin>>v[i];
#define nv int n ; cin>>n ; 
#define ns string s ; cin>>s ;
#define sot sort(v.begin() , v.end()) ;
#define tos sort(v.begin() , v.end() , greater<int>()) ;
#define pfs vector<int>pf(n) ;pf[0] = v[0]; for (int i = 1; i < n; i++) pf[i] = pf[i - 1] + v[i];
#define sfs vector<int>sf(n); sf[n-1] = v[n-1]; for (int i = n - 2; i >= 0; i--) sf[i] = sf[i + 1] + v[i];
#define stt  set<int>st ; st.insert(v.begin() , v.end());
#define mxheap priority_queue<int> pq;
#define mnheap priority_queue<int, vector<int>, greater<int>> pq;
#define pb push_back
#define SUM  long long vsum = accumulate(v.begin(), v.end(), 0LL);
#define cooking ios_base::sync_with_stdio(false); cin.tie(NULL);
#define co cout<<
#define ed <<endl ;
#define fl(i,n) for(int i=0;i<n;i++)
#define yes cout<<"YES\n";
#define no cout<<"NO\n";
#define INF 1000000000000000000LL
#define cooked cout<<ok<<endl ;
#define DFS(u) vis[u]=1; for(int v : a[u]) if(!vis[v]) DFS(v);
#define freqmap  unordered_map<int , int> mpp ; for(int i = 0 ; i < n ; i++) mpp[v[i]]++ ;
#define isSquare(n) ([](long long x){long long r=sqrtl(x);return r*r==x;})(n)
#define newline cout<<endl ;
using pii = pair<int , int> ;
// conc // string str = string(1 , s[i]) + s[i + 1] + s[i + 2] + s[i + 3] + 
// overflow // int mid = l + (r - l) / 2;
const ll MOD = 1e9 + 7;
//Bits
ll binaryToDecimal(string n){string num=n;ll dec_value=0;int base=1;int len=num.length();for(int i=len-1;i>=0;i--){if(num[i]=='1')dec_value+=base;base=base*2;}return dec_value;}
//Check
bool isPrime(ll n){if(n<=1)return false;if(n<=3)return true;if(n%2==0||n%3==0)return false;for(int i=5;i*i<=n;i=i+6)if(n%i==0||n%(i+2)==0)return false;return true;}
bool isPowerOfTwo(int n){if(n==0)return false;return (ceil(log2(n)) == floor(log2(n)));}
bool isPerfectSquare(ll x){if (x >= 0) {ll sr = sqrt(x);return (sr * sr == x);}return false;}
vector<ll> fact, invfact;
struct DSU {
    vector<int> parent, rankv;

    DSU(int n) {
        parent.resize(n + 1);
        rankv.resize(n + 1, 0);
        for (int i = 1; i <= n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]);
    }

    void unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a != b) {
            if (rankv[a] < rankv[b]) swap(a, b);
            parent[b] = a;
            if (rankv[a] == rankv[b]) rankv[a]++;
        }
    }
};
ll modpow(ll a, ll b) {
    ll res = 1;
    while (b) {
        if (b & 1) res = (res * a) % MOD;
        a = (a * a) % MOD;
        b >>= 1;
    }
    return res;
}
void dfs(int node, vector<vector<int>>& graph, vector<bool>& vis) {
    vis[node] = true;

    for (int child : graph[node]) {
        if (!vis[child]) {
            dfs(child, graph, vis);
        }
    }
}
void bfs(int start, vector<vector<int>>& graph, vector<bool>& vis) {
    queue<int> q;
    q.push(start);
    vis[start] = true;

    while (!q.empty()) {
        int node = q.front();
        q.pop();

        for (int child : graph[node]) {
            if (!vis[child]) {
                vis[child] = true;
                q.push(child);
            }
        }
    }
}
void init_fact(int N) {
    fact.assign(N + 1, 1);
    invfact.assign(N + 1, 1);
    for (int i = 1; i <= N; i++)
        fact[i] = (fact[i - 1] * i) % MOD;
    invfact[N] = modpow(fact[N], MOD - 2);   
    for (int i = N - 1; i >= 0; i--)
        invfact[i] = (invfact[i + 1] * (i + 1)) % MOD;
}
ll nCr(ll n, ll r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * invfact[r] % MOD * invfact[n - r] % MOD;
}


int main(){ ;

cooking
init_fact(1000000);
int t ;
cin>>t ;

while(t--){


int cnt = 0 ;
int ok = 0;
bool flag = true ;
 


}
return 0 ;
}