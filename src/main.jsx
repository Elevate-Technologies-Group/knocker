import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const root = document.getElementById('root')
root.style.cssText = 'margin:0;padding:0;'
document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;'

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
