import { isGoogleDocsUrl } from './utility/utility.js';

// Get the Current Active Tab
async function getCurrentTab() {
	const [tab] = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});

	return tab;
}

document.addEventListener('DOMContentLoaded', async () => {
	const statusText = document.getElementById('status');
	const loginButton = document.getElementById('login-button');
	const cancelButton = document.getElementById('cancel-button');
	const loginPage = document.getElementById('login-page');
	const settingsPage = document.getElementById('settings-page');
	const citationFormat = document.getElementById('citation-format');
	const continueButton = document.getElementById('continue-button');
	const backButton = document.getElementById('back-button');

	if (
		!statusText ||
		!loginButton ||
		!cancelButton ||
		!loginPage ||
		!settingsPage ||
		!citationFormat ||
		!continueButton ||
		!backButton
	) {
		console.error('Required elements not found in the DOM.');
		return;
	}

	// Get the current active tab and check if it's a Google Docs document
	const currentTab = await getCurrentTab();

	// If the current tab is not a Google Docs document, show an error message and disable the login button
	if (!isGoogleDocsUrl(currentTab.url)) {
		statusText.textContent = 'Please open a Google Docs document first.';
		loginButton.disabled = true;
		continueButton.disabled = true;
		return;
	}

	// User has clicked the login button, send a message to the service worker to initiate the Google Login Process
	loginButton.addEventListener('click', async () => {
		statusText.textContent = 'Logging in...';
		try {
			const response = await browser.runtime.sendMessage({
				type: 'GOOGLE_LOGIN',
			});

			// Login is successful, hide the login page and show the settings page, otherwise show an error message
			if (response?.ok) {
				statusText.textContent = 'Logged in successfully.';
				loginPage.hidden = true;
				settingsPage.hidden = false;
			} else {
				console.error('Login failed', response?.error);
				statusText.textContent = 'Login failed';
			}
		} catch (error) {
			console.log(error);
			statusText.textContent = 'Login failed';
		}
	});

	// User has clicked the continue button, save the settings to local storage and send message to service worker to begin processing
	continueButton.addEventListener('click', async () => {
		const format = citationFormat.value;

		// If the user has not selected a citation format, show an error message and return
		if (!format) {
			alert('Please select a citation format.');
			return;
		}

		// Save the settings to local storage
		await browser.storage.local.set({
			citationFormat: format,
		});

		// Send a message to the service worker to begin processing
		// include citationFormat, referencesStartPage and the current active tab in the message
		try {
			const _ = await browser.runtime.sendMessage({
				type: 'BEGIN_PROCESSING',
				citationFormat: format,
				tab: currentTab,
			});
		} catch (error) {
			console.error('BEGIN_PROCESSING message failed:', error);
		}
	});

	// User has clicked the back button, hide the settings page
	backButton.addEventListener('click', () => {
		settingsPage.hidden = true;
		loginPage.hidden = false;
	});

	// User has clicked the cancel button, close the popup
	cancelButton.addEventListener('click', () => {
		window.close();
	});
});
