import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { AnalysisProvider } from './context/AnalysisContext';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/';
const uri = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;

const client = new ApolloClient({
  uri,
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
