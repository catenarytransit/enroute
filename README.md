# Catenary Enroute

**Catenary Enroute** is a flexible, high-performance transit signage and onboard information system. Designed to adapt to various transit environments, it provides real-time arrivals, journey progress, and accessibility features with a customizable and modern aesthetic. Built to be extended and tailored to meet the unique needs of riders and transit agencies.

## ✨ Key Features

- 🚆 **Enroute View**: Real-time onboard display showing journey progress, next stops, and a dynamic vertical timeline.
- 🚉 **Station View**: Customizable landing page for specific stops, highlighting upcoming arrivals and line-specific branding.
- 📍 **Nearby Departures**: Intelligent discovery of transit options based on current location or manual overrides.
- 🎨 **Dynamic Design System**: Fully themeable with primary/secondary colours, supporting both landscape and portrait orientations.
- 🔊 **Integrated Enunciator**: Professional audio announcements and visual captions for enhanced accessibility.
- ⚙️ **Advanced Configuration**: On-the-fly customisation of location, routes, and time formats through an intuitive modal.
- 🔧 **Extensibility**: Modular architecture to support custom integrations, agency-specific branding, and unique rider needs.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/catenarymaps/enroute-screen.git
   cd enroute-screen
   ```

2. Install dependencies:
   ```bash
   pnpm install
   pnpm approve-builds # approve esbuild and sharp
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

5. Press `c` to open the configuration modal.

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Engine**: Customizable and extensible to integrate with various APIs.
  - **Stop Departures**: `https://birchdeparturesfromstop.catenarymaps.org/departures_at_stop`
    - Parameters: `stop_id`, `chateau_id`, `greater_than_time`, `less_than_time`, `include_shapes`
  - **Trip Information**: `https://birch.catenarymaps.org/get_trip_information`
    - Parameters: `chateau`, `trip_id`

## 📁 Project Structure

- `src/pages/index.astro`: The home view showing nearby departures.
- `src/pages/station.astro`: Detailed view for a single transit stop.
- `src/pages/enroute.astro`: The primary onboard "next stop" information screen.
- `src/components/display`: Contains React components for various display modes, such as onboard displays, station information, and nearby departures. Includes templates for creating new display components.
- `src/components/pane`: Contains modular UI elements (panes) like alerts, weather, and train departures. Each pane is dynamically loaded and configurable.
- `src/components/PaneEditorModal.tsx`: The global preferences and system personalization dashboard.
- `src/utils/DynamicLoader.ts`: Dynamically loads panes and displays at runtime, supports metadata-driven configuration, and optimizes performance with caching.
- `src/utils/EnrouteManager.ts`: Core logic for managing enroute displays and data synchronization.

## 📐 Architecture

The application uses an intelligent multi-mode architecture driven by URL query parameters:

- `/?mode=default`: Nearby discovery mode.
- `/?mode=station&chateau=...&stop=...`: Station platform mode.
- `/?mode=enroute&chateau=...&trip=...`: Onboard information mode.

It relies on `localStorage` for persistent preferences like 24-hour time and custom themes, ensuring a consistent experience across sessions.

---

Made with ❤️ by [Catenary Maps](https://catenarymaps.org).
