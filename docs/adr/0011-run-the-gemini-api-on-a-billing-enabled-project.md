# 0011. Run the Gemini API on a project with billing enabled

- Status: Accepted
- Date: 2026-11-24
- Issue: #33

## Context

ADR 0008 chose Gemini and ran it on the free tier. It also noted that we could not confirm which
data terms apply to visitors in the EEA, the UK and Switzerland. The privacy notice (#33) has to
say what Google does with the questions, so we checked Google's Gemini API Additional Terms
(effective 23 March 2026):

- Only Paid Services may be used when an API client is made available to users in the EEA,
  Switzerland or the UK. Stromblick is a German site, so this applies to it.
- For Paid Services, Google does not use prompts and answers to improve its products. It logs them
  for a limited time to detect misuse, keep the service safe and meet legal duties.
- When a Cloud Billing account is active on the project, all use of the Gemini API counts as a Paid
  Service, even inside the free quota.

The README and the note under the assistant's input said the opposite: that Google may use the
questions to improve its products.

## Decision

- We enable Cloud Billing on the Google project behind `GEMINI_API_KEY`, so all assistant use is a
  Paid Service.
- The assistant's note, the README and the privacy notice say that Google treats the questions as a
  paid service and does not use them to improve its products.
- The app's own limits stay as they are (5 questions a minute per visitor, 12 model requests a
  minute and 400 a day for the whole site). They are now the cost brake, together with a budget
  alert in Google Cloud that the owner sets up.

## Alternatives considered

- **Stay on the free tier**: not allowed for visitors in the EEA under the terms above.
- **Block visitors from the EEA**: the site is for Germany, so the assistant would be useless.
- **Another model provider**: possible behind the `LlmClient` interface (ADR 0008), but it costs
  money from the first request and needs a new adapter and tests.
- **Turn the assistant off**: loses the feature that shows tool use and streaming.

## Consequences

The assistant can cost money. The limits above keep it small, but the real cost has to be watched:
look at the billing report after the first week. The statement in ADR 0008 that the free quota is
shared by all visitors still describes the model limits we stay under. If Google changes its terms
again, the privacy notice must change in the same pull request.
