import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: funciona em https://<usuario>.github.io/<repositorio>/ sem configuração extra
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
