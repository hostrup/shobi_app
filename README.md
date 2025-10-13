# Shobi Perfume Finder

An advanced and user-friendly single-page web application, designed to help users explore and find inspiration among "dupe" perfumes from the webshop [leparfum.com.gr/en/](https://leparfum.com.gr/en/).

The application is built with pure (vanilla) JavaScript, HTML5, and CSS3, and is enriched with several reputable libraries to deliver a fast, beautiful, and intuitive user experience. All data is loaded from an external `database_complete.json` file, which makes maintenance and updates simple.

## Features

* **Asynchronous Data Loading:** All perfume data is fetched asynchronously from a local JSON file. This ensures a fast page load and makes it easy to update the perfume collection without having to change the code.

* **Advanced Search & Filtering:**
    * A powerful **real-time search function** that queries across all perfume attributes (brand, name, notes, etc.).
    * Filtering based on **scent accords, season, occasion, and gender**.

* **Flexible View Modes:**
    * **Grid View:** A responsive and visually appealing grid layout, perfect for browsing and getting a quick overview.
    * **List View:** A more detailed list view that provides more information about each perfume.

* **User-Centric Tools:**
    * **Favorites System:** Mark perfumes with a heart to save them to a personal list. Favorites are stored locally in the browser using `localStorage`.
    * **"Surprise Me" Function:** Get a random perfume presented with a single click.

* **Interactive Data Visualization:**
    * Detailed information about each perfume's "inspiration" is displayed in a pop-up (modal) window, complete with visual charts (doughnut and radar charts) powered by **Chart.js**.

* **Personalization:**
    * Switch between **four different color themes** to customize the appearance. Your choice is saved in `localStorage` for your next visit.

* **Performance Optimized:**
    * Results are loaded in "chunks" to ensure a fast startup, even with a large amount of data. The user can load more results as needed.

## Technical Overview

* **Frontend:**
    * **HTML5:** Semantic markup for a well-structured application.
    * **CSS3:** Custom styling for a unique and responsive design.
    * **JavaScript (ES6+):** The core of the application's logic and interactivity.

* **Libraries:**
    * **Bootstrap 5.3.3:** Used for layout, the grid system, and UI components like modal windows.
    * **Font Awesome 6.5.2:** For icons throughout the user interface.
    * **Chart.js:** For visualizing scent data in an easy-to-understand way.

## Installation and Usage

1.  Clone or download this repository.
2.  Place your `database_complete.json` file in the same directory as `index.html`.
3.  Open `index.html` in a modern web browser.

## Disclaimer

This project is an independent initiative and is intended solely for personal, inspirational, and non-commercial use.

* **No Affiliation:** I am not affiliated, associated, authorized, endorsed by, or in any way officially connected with Shobi ([leparfum.com.gr](https://leparfum.com.gr)) or any of the original perfume brands mentioned in the data. All product and company names are trademarks™ or registered® trademarks of their respective holders.

* **Data Accuracy:** The perfume data provided in the JSON file is compiled for inspirational purposes. I do not take responsibility for the accuracy, completeness, or timeliness of this data. The data should not be considered an official source.

## License

This project is licensed under the **GPL-3.0 License**. See the `LICENSE` file for details.
