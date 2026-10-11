import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './styles.css'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/global.css'
import './styles/brand.css'
import './styles/auth.css'
import './styles/layout.css'
import './styles/home.css'
import './styles/booking.css'
import './styles/details.css'
import './styles/settings.css'
import './styles/footer.css'
import './styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
