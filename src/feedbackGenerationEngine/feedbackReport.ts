import browser from 'webextension-polyfill';

const reportRoot = document.getElementById('feedback-report');

async function loadFeedbackReport() {
	if (!reportRoot) {
		return;
	}

	const storedReport = await browser.storage.local.get('vericiteFeedbackReportHtml');
	const reportHtml = storedReport.vericiteFeedbackReportHtml;

	if (!reportHtml) {
		reportRoot.innerHTML =
			'<section class="empty-state">No feedback report was found. Please run VeriCite again.</section>';
		return;
	}

	// Injects the HTML created into the report HTML root.
	reportRoot.innerHTML = String(reportHtml);
}

loadFeedbackReport().catch((error) => {
	console.error('Failed to load feedback report:', error);

	if (reportRoot) {
		reportRoot.innerHTML =
			'<section class="empty-state">The feedback report could not be loaded.</section>';
	}
});
