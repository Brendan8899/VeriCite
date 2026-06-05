export type UrlValidationResult = {
	found: boolean;
	url: string;
	reachable: boolean;
};

export type FinalCheckResult = {
	originalReference: string;
	reference: string;
	validityResults: ValidityResult;
};

export type ValidityResult = {
	valid: boolean;
	sourceVerified: boolean;
	errors: Array<string>;
	warnings: Array<string>;
};

export type ReferenceStatus = {
	label: string;
	className: string;
};

export type FeedbackGenerationMessage = {
	ok: boolean;
	tabId: number | undefined;
	referenceCount: number;
	error: string | undefined;
	html: string;
};

export type TransformedBookStructure = {
	authors: Array<string>;
	title: string | undefined;
	isbn: Array<string>;
	publishedDate: string | undefined;
};

export type VerifySourceResult = {
	ok: boolean;
	valid: boolean;
	bestMatch: TransformedBookStructure | undefined;
	matches: Array<TransformedBookStructure>;
	errors: Array<string>;
	warnings: Array<string>;
};

export type ScoredBookMatch = TransformedBookStructure & {
	score: number;
};

export type FormatValidationResult = {
	valid: boolean;
	errors: Array<string>;
	warnings: Array<string>;
	sourceVerified: boolean;
};

export type HasYearResult = {
	found: boolean;
	value: number | undefined;
	errors: Array<string> | undefined;
	warnings: Array<string>;
};

type CitationFormat = 'APA' | 'MLA' | 'IEEE';

type GoogleLoginMessage = {
	type: 'GOOGLE_LOGIN';
};

type BeginProcessingMessage = {
	type: 'BEGIN_PROCESSING';
	citationFormat: CitationFormat;
	tab: browser.tabs.Tab;
};

type CheckAuthMessage = {
	type: 'CHECK_AUTH';
};

export type RuntimeMessageType = GoogleLoginMessage | BeginProcessingMessage | CheckAuthMessage;

export type GoogleLoginResponse = { ok: true } | { ok: false; error: string };

export type RuntimeResponse =
	| { ok: boolean; data: FinalCheckResult[]; feedbackReport: FeedbackGenerationMessage }
	| { ok: boolean; error: string };

export type AuthCheckResponse = { ok: boolean };
