import { FinalCheckResult, ReferenceStatus, FeedbackGenerationMessage } from "../types";

function getOriginalReference(result: FinalCheckResult): string {
	return result.originalReference;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Function to render a list based on list of warning or list of errors
function renderFeedbackList(title: string, items: Array<string>, className: string) {
	if (!items?.length) {
		return '';
	}

	return `
		<section class="feedback-block ${className}">
			<h4>${title}</h4>
			<ul>
				${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
			</ul>
		</section>
	`;
}

// Show the Appropriate Label with the Appropriate CSS Styles based on Status
function getStatus(result: FinalCheckResult): ReferenceStatus {
	const validityResult = result.validityResults;
	const errors = validityResult.errors || [];
	const warnings = validityResult.warnings || [];

	// If there are errors, then show the Errors Message
	if (errors.length) {
		return {
			label: 'Needs fixes',
			className: 'status-error',
		};
	}

	// If there are warnings, then show the Warnings Message
	if (warnings.length) {
		return {
			label: 'Warnings',
			className: 'status-warning',
		};
	}

	// If the Citation Format pass and Source Validation pass
	if (validityResult?.sourceVerified && validityResult?.valid) {
		return {
			label: 'Format Passed and Source Validated',
			className: 'status-success',
		};
	}

	// Catching Return in case none of the conditions match
	return {
		label: 'Review',
		className: 'status-neutral',
	};
}

// Function to Render Reference Card, 1 Reference Card for each Reference
function renderReferenceResult(result: FinalCheckResult, index: number): string {
	const originalReference = getOriginalReference(result);
	const validityResult = result.validityResults;
	const errors = validityResult.errors || [];
	const warnings = validityResult.warnings || [];
	const status = getStatus(result);

	return `
		<article class="reference-card">
			<header>
				<div>
					<p class="eyebrow">Reference ${index + 1}</p>
					<h2>${escapeHtml(originalReference || 'Untitled reference')}</h2>
				</div>
				<span class="status ${status.className}">${status.label}</span>
			</header>

			${renderFeedbackList('Errors', errors, 'errors')}
			${renderFeedbackList('Warnings', warnings, 'warnings')}

			${
				!errors.length && !warnings.length
					? '<p class="empty-feedback">No errors or warnings were reported for this reference.</p>'
					: ''
			}
		</article>
	`;
}

export function buildFeedbackReportHtml(results: Array<FinalCheckResult>): string {
	const safeResults = results || [];
	const generatedAt = new Date().toLocaleString();

	// Use Reduce in Functional Programming to get the Total Number of Errors for all References
	const errorCount = safeResults.reduce(
		(total, result) => total + (result.validityResults.errors.length || 0),
		0,
	);

	// Use Reduce in Functional Programming to get the Total Number of Warnings for all References
	const warningCount = safeResults.reduce(
		(total, result) => total + (result.validityResults.warnings.length || 0),
		0,
	);

	return `
		<header class="report-header">
			<h1>VeriCite Feedback Report</h1>
			<p>Generated ${escapeHtml(generatedAt)}</p>
		</header>

		<section class="summary" aria-label="Report summary">
			<div class="summary-item">
				<strong>${safeResults.length}</strong>
				<span>References checked</span>
			</div>
			<div class="summary-item">
				<strong>${errorCount}</strong>
				<span>Errors</span>
			</div>
			<div class="summary-item">
				<strong>${warningCount}</strong>
				<span>Warnings</span>
			</div>
		</section>

		${
			safeResults.length
				? safeResults.map((result, index) => renderReferenceResult(result, index)).join('')
				: '<section class="empty-state">No references were available to report.</section>'
		}
	`;
}

export async function feedbackGeneration(results: Array<FinalCheckResult>): Promise<FeedbackGenerationMessage> {
	// Creates the html String
	const html = buildFeedbackReportHtml(results);

	// If can't create a new tab then give an Error
	if (!globalThis.browser?.tabs?.create) {
		return {
			ok: false,
			tabId: undefined,
			referenceCount: 0,
			error: 'Cannot open feedback report because browser.tabs.create is unavailable.',
			html,
		};
	}

	// Set it into browser storage
	await browser.storage.local.set({
		vericiteFeedbackReportHtml: html,
	});

	const reportUrl = browser.runtime.getURL('src/feedbackGenerationEngine/feedbackReport.html');

	// Opens a new tab in order to show the HTML Documents
	const tab = await browser.tabs.create({
		url: reportUrl,
		active: true,
	});

	return {
		ok: true,
		tabId: tab?.id,
		referenceCount: results?.length || 0,
		error: undefined,
		html,
	};
}
