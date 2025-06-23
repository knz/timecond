# TimeCond React Example UI

This directory contains a React-based playground and test UI for the [TimeCond](../../packages/timecond) library.

## What is this?

This app lets you interactively experiment with the TimeCond library:

- Enter and parse time condition expressions using the custom DSL (domain-specific language)
- Select reference and evaluation dates
- Visualize evaluation results, including next/last occurrences and active ranges
- See human-readable descriptions of parsed conditions
- Try out all features of the TimeCond library in a user-friendly interface

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Install dependencies

Using npm:

```sh
npm install
```

Or using yarn:

```sh
yarn install
```

### Run the development server

Using npm:

```sh
npm run dev
```

Or using yarn:

```sh
yarn dev
```

This will start the app on [http://localhost:5173](http://localhost:5173) (or another port if 5173 is taken).

## Features

- **Expression Editor:** Write and edit time condition expressions using the TimeCond DSL
- **Date Pickers:** Choose reference and evaluation dates for testing
- **Evaluation Results:** See if a date matches, next/last active ranges, and more
- **Human-Readable Descriptions:** Get plain-English explanations of your conditions
- **Visualization:** View time ranges and events on a timeline
- **Examples & Help:** Access example expressions and documentation from within the app

## For Developers

- The main entry point is [`src/App.tsx`](./src/App.tsx)
- The core playground logic is in [`src/components/timecondtester/`](./src/components/timecondtester/)
- The app uses [Vite](https://vitejs.dev/) for fast development

## License

See the root project for license information.
