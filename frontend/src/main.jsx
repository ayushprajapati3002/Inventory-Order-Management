import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: '#1a1d2e',
          border: '1px solid #2a2d3e',
          borderRadius: '10px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
