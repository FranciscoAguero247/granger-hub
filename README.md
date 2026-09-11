# Granger YSA Ward - Web Communications Hub

A lightweight, zero-signup web portal designed for the Granger YSA Ward (Taylorsville Utah YSA Stake). Built with **Next.js 16**, **TypeScript**, and **Tailwind CSS**, this platform serves as a centralized launcher for ward activities, Sunday meeting schedules, direct contact channels, and live announcements pulled dynamically from Google Sheets.

---

## Features

- **Live Google Sheets Feed**: Dynamically parses live announcements and image flyer URLs published via Google Sheets CSV export without requiring database setup or backend APIs.
- **Smart Image URL Normalization**: Automatically converts standard Google Drive view/share links into direct image sources (`drive.google.com/uc?export=view`).
- **Interactive Lightbox**: Users can tap/click on any flyer image to view it in full screen with a backdrop modal.
- **Resilient Fallbacks**: Gracefully renders image-only announcements if text details or titles are omitted in the spreadsheet.
- **Zero-Signup Launchers**: Single-tap shortcuts to the official Facebook Group, WhatsApp chat, and Messenger contacts.
- **PWA Installation Guide**: Built-in prompt explaining how to add the web app to iOS (Safari) and Android (Chrome) home screens.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescript.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Source**: Google Sheets (Published CSV Endpoint)

---

## Architecture Overview

- **Frontend Shell**: Single-page launcher experience served from the App Router.
- **Configuration Layer**: Static ward metadata and channel links maintained in app config.
- **Content Feed Layer**: CSV-based ingestion from a published Google Sheet for announcements and flyers.
- **Media Handling**: URL normalization for Google Drive links to ensure direct image rendering in-browser.
- **UX Layer**: Mobile-first card layout with responsive tablet/desktop views and flyer lightbox interactions.

---

## Google Sheets Setup and CSV Schema

To feed live announcements into the app:

1. Create a Google Sheet with the following 5 columns in Row 1:

| Column | Header | Description | Required? |
| :--- | :--- | :--- | :--- |
| **A** | `Title` | Event name or announcement title | Optional (Defaults to "Event Flyer") |
| **B** | `Details` | Body text / event description | Optional |
| **C** | `Date` | Event date or time string | Optional |
| **D** | `Category` | Tag name (for example `FHE`, `Sports`, `Temple`) | Optional (Defaults to "Flyer") |
| **E** | `ImageURL` | Direct image link or Google Drive sharing URL | Optional |

2. In Google Sheets, go to **File** -> **Share** -> **Publish to web**.
3. Select **Entire Document** (or a specific sheet) and set the format to **Comma-separated values (.csv)**.
4. Copy the generated CSV link and assign it to the `GOOGLE_SHEET_CSV_URL` constant inside `app/page.tsx`.

### Adding Flyers via Google Drive

1. Upload a `.jpg` or `.png` flyer to Google Drive.
2. Set file sharing access to **Anyone with the link**.
3. Copy the link and paste it into **Column E** (`ImageURL`).

The app automatically transforms supported Drive sharing URLs into a displayable raw image URL.

---

## Flyer Publishing Workflow

1. Create or export your flyer image.
2. Upload to Google Drive and enable share access.
3. Add or update a row in the Google Sheet with optional metadata and the image URL.
4. Save the sheet; the published CSV endpoint updates.
5. Visitors immediately see updated flyer content on the web hub without redeploying.

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- `npm` or `pnpm`

### Installation

1. Clone the repository:

```bash
git clone https://github.com/FranciscoAguero247/granger-ysa-hub.git
cd granger-ysa-hub
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser.

---

## Deployment

This project is optimized for deployment on Vercel.

Build locally:

```bash
npm run build
```

Or deploy directly using the Vercel CLI:

```bash
npx vercel
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Optional Next Additions

- Add a Google Form setup section for automated flyer submissions.
- Add a standard MIT License file to the repository.
