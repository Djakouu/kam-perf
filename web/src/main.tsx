import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { AnalysisProvider } from './context/AnalysisContext';

let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/';

// Fix for Render Blueprint 'host' property which returns the internal slug (e.g. "lighthouse-api-xxxx")
// instead of the public URL. Since the frontend runs in the browser, we need the public URL.
if (!apiUrl.startsWith('http')) {
  if (!apiUrl.includes('.') && !apiUrl.includes(':') && !apiUrl.includes('localhost')) {
    apiUrl = `https://${apiUrl}.onrender.com`;
  } else {
    apiUrl = `https://${apiUrl}`;
  }
}

const client = new ApolloClient({
  uri: apiUrl,
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <AnalysisProvider>
        <App />
      </AnalysisProvider>
    </ApolloProvider>
  </React.StrictMode>,
)
