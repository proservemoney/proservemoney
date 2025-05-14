module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        input: {
          text: '#000000', // Black text for inputs
          background: '#ffffff',
          placeholder: '#9ca3af', // Gray-400
          border: '#d1d5db', // Gray-300
        },
      },
    },
  },
  plugins: [],
} 