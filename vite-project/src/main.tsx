import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Respect system preference for dark mode and persist user choice
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');
const rootEl = document.documentElement;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  rootEl.classList.add('dark');
} else {
  rootEl.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
