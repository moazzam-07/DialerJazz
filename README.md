<div align="center">
  <img src="./logo.png" alt="DialerJazz Logo" width="70%"/>

  # DialerJazz
  **Premium SaaS Power Dialer — Tinder for Sales Calls**

  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
  [![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)

  [Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Contributing](#contributing)
</div>

<br />

## 🌟 The Pitch

DialerJazz is the future of outbound sales. We've built an open-source, ultra-premium SaaS Power Dialer that flips the traditional CRM model on its head. Instead of boring tables and lists, DialerJazz implements a "Tinder for Sales Calls" interface: rapidly swipe, categorize, and execute outbound campaigns with a beautifully designed, gamified experience to maximize SDR productivity.

## 📸 In Action
*(Screenshots & GIFs coming soon upon application completion...)*

## ✨ Features

- **Tinder-Style Call UI:** Swipe interface to navigate through rapid fire sales lists.
- **Premium Aesthetics:** 'Midnight Emerald' theme, beautiful typography, dark modes, and micro-animations to keep reps engaged.
- **Dual-Stack Architecture:** Separated React client and powerful Node Server.
- **BaaS Ready:** Powered by InsForge for Auth, Database, Storage, and Real-time websockets.
- **Secure by Default:** Complete JWT auth flows out-of-the-box.

## 🚀 Quick Start

Getting started with DialerJazz locally is a breeze. It's a monorepo containing both the React frontend and Node.js backend.

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with a package manager like `npm`. You will also need an [InsForge](https://insforge.app) project configured.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/DialerJazz.git
   cd DialerJazz
   ```

2. **Install global dependencies for both client and server:**
   ```bash
   npm run install:all
   ```

3. **Environment Setup:**
   Duplicate the `.env.example` file in the root, rename it to `.env`, and populate your InsForge keys and secrets:
   ```bash
   cp .env.example .env
   ```

4. **Run the stack:**
   ```bash
   npm run dev
   ```
   *This single command will spin up the `client/` frontend on port 5173 and the `server/` backend.*

## 🏗 Architecture

DialerJazz uses a decoupled architecture for maximum scalability:
- **Frontend (`/client`):** A modern React application taking care of the gorgeous UI, state management, and real-time InsForge updates.
- **Backend (`/server`):** A robust Node.js backend using Express to handle complex application logic, dialing infrastructure orchestration, and heavy external integrations.

## 🤝 Contributing

We love contributions! Whether it's adding new features, fixing bugs, or improving documentation, check out our [Contributing Guide](CONTRIBUTING.md) to see how you can help make DialerJazz even better. 

Please ensure you adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🛡️ Security

If you discover a security vulnerability within DialerJazz, please consult our [Security Policy](SECURITY.md) for reporting guidelines.

## 📄 License

DialerJazz is open-sourced software licensed under the [MIT license](LICENSE).
