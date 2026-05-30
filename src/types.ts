export type UrlValidationResult = {
    found: boolean;
    url: string;
    reachable: boolean;
}

export type FinalCheckResult = {
    originalReference: string;
    reference: string;
    validityResults: ValidityResult;
}

export type ValidityResult = {
    valid: boolean;
    sourceVerified: boolean;
    errors: Array<string>;
    warnings: Array<string>;
}

export type ReferenceStatus = {
    label: string;
    className: string;
}

export type FeedbackGenerationMessage = {
    ok: boolean;
    tabId: number | undefined;
    referenceCount: number;
    error: string | undefined,
    html: string,
}

export type TransformedBookStructure = {
    authors: Array<string>;
    results: Array<string> | undefined;
    title: string | undefined;
    isbn: Array<string>;
    publishedDate: string
}

export type VerifySourceResult = {
    ok: boolean;
    valid: boolean;
    bestMatch: TransformedBookStructure | undefined;
    matches: Array<TransformedBookStructure>;
    errors: Array<string>;
    warnings: Array<string>
}

export type ScoredBookMatch = TransformedBookStructure & {
	score: number;
};

export type FormatValidationResult = {
    valid: boolean;
    errors: Array<string>;
    warnings: Array<string>;
    sourceVerified: boolean
}

export type HasYearAPAResult = {
    found: boolean;
    value: number | undefined;
    error: string | undefined;
    warning: string | undefined
}