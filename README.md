# React Video Player

A custom video player built with React and HLS.js, featuring adaptive streaming and interactive chapter navigation.

## Features

- **HLS Streaming**: Seamless playback of HLS streams using `hls.js`.
- **Chapter Navigation**: Interactive timeline with chapter markers and hover previews.
- **Custom Controls**: tailored video controls for a better user experience.
- **Responsive Design**: Adapts to different screen sizes.

## Tech Stack

- **React**: UI library.
- **Vite**: Build tool and development server.
- **HLS.js**: HLS client for modern browsers.
- **React Icons**: Icon library.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd react-video-player
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

Build the app for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

- `src/components`: Contains the `VideoPlayer` and other components.
- `src/App.jsx`: Main application component.
- `public`: Static assets.
