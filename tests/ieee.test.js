import { vi, test, describe, expect, beforeEach, afterEach } from 'vitest';

vi.mock("../utility.js", () => ({
  isValidUrl: vi.fn(async () => ({
    found: true,
    reachable: true,
    url: "https://mock-url.com",
  })),

  normalizeWhitespace: vi.fn((citation) =>
    citation.replace(/\s+/g, " ").trim()
  ),
}));

import { isValidIEEE } from '../src/verifyIEEE';

describe('isValidIEEE - format validation', () => {

  // All test citations will be taken from IEEE Reference from:
  // https://ieee-dataport.org/sites/default/files/analysis/27/IEEE%20Citation%20Guidelines.pdf
  test('should validate a correct E-book citation', async () => {
    const normalizedEbookCitation = normalizeWhitespace(`[1] L. Bass, P. Clements, and R. Kazman, Software Architecture in Practice, 2nd ed.
        Reading, MA: Addison Wesley, 2003. [E-book] Available: Safari e-book`);
    const result = await isValidIEEE(normalizeWhitespace);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate a correct Article in Online Encyclopedia citation', async () => {
    const normalizedArticleOnline = normalizeWhitespace(`[2] D. Ince, “Acoustic coupler,” in A Dictionary of the Internet. Oxford University
        Press, [online document], 2001. Available: Oxford Reference Online,
        http://www.oxfordreference.com [Accessed: May 24, 2007].`);
    const result = await isValidIEEE(normalizedArticleOnline);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct Journal Article Abstract citation', async () => {
    const normalizedJournalArticleAbstract = normalizeWhitespace(`[1] M. T. Kimour and D. Meslati, “Deriving objects from use cases in real-time
        embedded systems,” Information and Software Technology, vol. 47, no. 8, p. 533,
        June 2005. [Abstract]. Available: ProQuest, http://www.umi.com/proquest/.
        [Accessed November 12, 2007].`)
    const result = await isValidIEEE(normalizedJournalArticleAbstract);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct Journal Article in Scholarly Journal citation', async () => {
    const normalizedScholarlyJournal = normalizeWhitespace(`[2] A. Altun, “Understanding hypertext in the context of reading on the web:
        Language learners’ experience,” Current Issues in Education, vol. 6, no. 12,
        July, 2005. [Online serial]. Available:
        http://cie.ed.asu.edu/volume6/number12/. [Accessed Dec. 2, 2007].`)
    const result = await isValidIEEE(normalizedScholarlyJournal);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct Newspaper Article from the Internet citation', async () => {
    const normalizedNewspaperArticle = normalizeWhitespace(`[3] C. Wilson-Clark, “Computers ranked as key literacy,” The Atlanta Journal
        Constitution, para. 3, March 29, 2007. [Online], Available:
        http://www.thewest.com.au. [Accessed Sept. 18, 2007].`);
    const result = await isValidIEEE(normalizedNewspaperArticle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct Professional Internet Site citation', async () => {
    const normalizedProfessionalInternetSite = normalizeWhitespace(`[1] European Telecommunications Standards Institute, “Digital Video Broadcasting
        (DVB): Implementation guide for DVB terrestrial services; transmission aspects,”
        European Telecommunications Standards Institute, ETSI-TR-101, 2007. [Online].
        Available: http://www.etsi.org. [Accessed: Nov. 12, 2007].`)
    const result = await isValidIEEE(normalizedProfessionalInternetSite);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct General Internet Site', async () => {
    const normalizedGeneralInternetSite = normalizedWhitespace(`[2] J. Geralds, “Sega Ends Production of Dreamcast,” vnunet.com, para. 2, Jan. 31,
        2007. [Online]. Available: http://nli.vnunet.com/news/1116995. [Accessed Sept.
        12, 2007].`)
    const result = await isValidIEEE(normalizedGeneralInternetSite);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct Email citation', async () => {
    const normalizedEmailCitation = normalizedWhitespace(`[4] J. Aston. “RE: new location, okay?” Personal email (July 3, 2007).`)
    const result = await isValidIEEE(normalizedEmailCitation);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate a correct Lecture citation', async () => {
    const normalizedLectureCitation = normalizedWhitespace(`[1] S. Bhanndahar. ECE 4321. Class Lecture, Topic: “Bluetooth can’t help you.”
        School of Electrical and Computer Engineering, Georgia Institute of Technology,
        Atlanta, GA, Jan. 9, 2008.`);
    const result = await isValidIEEE(normalizedLectureCitation);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate Single Author Book citation', async () => {
    const normalizedSingleAuthorBook = normalizeWhitespace(`[1] W. K. Chen, Linear Networks and Systems. Belmont, CA: WadsworthPress,
        2003.`);
    const result = await isValidIEEE(normalizedSingleAuthorBook);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate Three or More Authors Book citation', async () => {
    const normalizeMultipleAuthorBook = normalizeWhitespace(`[4] R. Hayes, G. Pisano, and S. Wheelwright, Operations, Strategy, and Technical
        Knowledge. Hoboken, NJ: Wiley, 2007.`);
    const result = await isValidIEEE(normalizeMultipleAuthorBook);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate Organizational Author Book citation', async () => {
    const normalizeOrganizationAuthorBook = normalizeWhitespace(`[5] Council of Biology Editors, Scientific Style and Format: The CBE Manual for
        Authors, Editors, and Publishers, 6th ed., Chicago: Cambridge University Press,
        2006.`);
    const result = await isValidIEEE(normalizeOrganizationAuthorBook);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })

  test('should validate Technical Report citation', async () => {
    const normalizeTechnicalReport = normalizeWhitespace(`[8] K. E. Elliott and C. M. Greene, “A local adaptive protocol,” Argonne National
        Laboratory, Argonne, France, Tech. Report. 916-1010-BB, 7 Apr. 2007.`)
    const result = await isValidIEEE(normalizeTechnicalReport);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate Conference Paper citation', async () => {
    const normalizeConferencePaper = normalizeWhitespace(`[12] J. Smith, R. Jones, and K. Trello, “Adaptive filtering in data communications with
        self improved error reference,” In Proc. IEEE International Conference on
        Wireless Communications ’04, 2004, pp. 65`)
    const result = await isValidIEEE(normalizeConferencePaper);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  })


});
