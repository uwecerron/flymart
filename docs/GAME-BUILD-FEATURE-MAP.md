# FlyMart game delivery feature map

Purpose: make the next game faster to ship by reusing verified integrations and catching repeat failures early. This is an engineering map, not a new public website feature. Status reflects evidence collected in this workspace, not assumptions about production.

## Failure to guardrail map

| What happened or remains uncertain | Reusable feature | Required evidence | Status |
| --- | --- | --- | --- |
| Illustrative games were confused with repository execution | Release manifest with repository, full commit, file hashes and local modifications | Integrity gate plus upstream behavior comparison | Integrity gate implemented; behavioral equivalence still manual |
| Native projects looked like playable browser games | Explicit runtime support and unavailable state | Browser-compatible entry and actual session | Existing unavailable state; manifest rejects native runtime |
| Player overflowed the viewport | Shared screen-fitting player, scrollable details and responsive controls | Screenshots at 390×844, 768×1024, 1440×900 and keyboard checks | Layout changed; browser QA still outstanding |
| Fly was small and diagnostics dominated | Camera follow, initial zoom, optional diagnostics, concise instructions | Feed/touch/air interactions and camera checks | Implemented; browser QA still outstanding |
| Center button moved the animal | Separate camera state from model state | Center action leaves animal position and brain state unchanged | Code changed; interaction regression test needed |
| Build failed on Vercel | Provider-specific build, fixed Node major, CI installation and build | Clean npm ci and production build | Local build passed previously; CI workflow added |
| Immutable assets could hide fixes | Versioned runtime paths and file checksums | New release ID whenever shipped bytes change | fm2 version and checksum manifest implemented |
| Push was described without deployed verification | Deployment evidence record | Production commit, HTTP check, asset version and browser smoke | Required process; deployment monitor not implemented |
| Browser execution cost and download size were unclear | Explicit start, download budget, worker execution | Cold/warm load size, frame time and memory measurements | Existing explicit start; 16 MB artifact budget enforced; performance benchmark pending |
| Private repository was confused with private client code | Separate public runtime and licensed source archive | No secrets in runtime; entitlement-gated source download | Documented; security tests still needed |
| Stripe recovery code was supplied as an API key | Configuration validation and secret handling | Correct server-side API credential type, webhook verification | Never use recovery codes; live payment readiness not established |
| Payment integration could be mistaken for a complete marketplace | Seller onboarding, entitlement and refund test harness | Test checkout, signed webhook, replay handling, buyer-only download | Production flow needs end-to-end verification |
| Chain deployment was confused with brokerage listing | Explicit network capability registry and verified explorer links | Chain ID and supported deployment proof | RPC reads completed; no token deployed |
| Local token tests could imply a finished launchpad | Separate contract, pool, liquidity lock and publishing gates | Testnet receipts and actual pool/lock integration | 12 local contract tests and 4 model tests; pool/lock absent |
| Generic AI copy obscured what actually worked | Plain copy with accurate action labels | No fake play, volume, holders, verification or completion claims | Editorial review required; no em dashes in new product copy |

## Delivery path

1. Define: game identity, actual upstream, license, expected behavior, device requirements, budget and acceptance criteria.
2. Import: pin commit, record data/model versions, inspect licenses and dependencies. Never run arbitrary source with platform credentials.
3. Adapt: change presentation separately from simulation. Record every local modification. Keep original behavior inputs and data identifiable.
4. Package: build an immutable release, hash files, record public entry and download size. Human review must approve new hashes; a hash refresh is not verification.
5. Verify: run npm run release:check, then browser checks below. Attach evidence to the release record.
6. Publish: deploy the exact checked commit, verify the production version, run smoke tests and record rollback target.
7. Observe: record crashes, loading failures, slow devices and confusing interactions without collecting game secrets or wallet credentials.

## Harness that exists now

- quality/releases.json describes the current FlyBrain artifact, pinned source, license, modifications, entry and checksums.
- scripts/quality-gate.mjs checks declared file integrity, path containment, download budget, metadata and Vercel build configuration.
- Eight tests deliberately break metadata, checksums, paths and budgets to ensure rejection works.
- npm run qa runs those checks. npm run release:check adds the production build.
- GitHub Actions runs installation and release checks for pushes and pull requests.

This harness validates declared files. It is not an untrusted archive scanner, license verifier, source-equivalence proof, browser test, or sandbox. The Vercel build now runs the integrity gate through prebuild:vercel, so those failures stop the build. Protected-branch review rules still need repository configuration. Browser, payment and token evidence are not yet automatically enforced.

## Next harness features, in order

### P0: Browser acceptance runner

Add Playwright as a development dependency and exercise the actual production build. Tests must start the simulation, wait for worker readiness, capture uncaught exceptions and failed requests, and verify the real connectome loads. Test Feed, Touch, Air, zoom, camera follow, stats and closing/reopening. Verify closing destroys the iframe/worker. Compare screenshots at the three viewport sizes. Include keyboard dismissal, focus restoration and touch input. A screenshot alone does not prove the model works.

Use deterministic seeds only where upstream supports them. For behavioral tests, assert ranges and eventual responses rather than exact frame snapshots. Record source commit, input sequence, simulation steps and output observations. Never add a fake success signal to make a test pass.

### P0: Publication evidence and enforcement

Each release gets a record based on quality/release-evidence.template.json. Missing browser or deployment proof means unverified, not passed. Require protected-main CI checks, then deploy the checked commit. Verify deployed HTML references the correct runtime and immutable files match. Keep a rollback target. Add this enforcement only after provider integration is available.

### P1: Runtime isolation and cost limits

Serve creator builds from a separate origin with restrictive iframe permissions and explicit postMessage contracts. Provide isolated disposable builds with CPU, memory, disk, time and network limits. Add archive traversal/symlink checks and secret scanning. Browser compatibility and resource budgets must be per game, measured on a named reference device. No automatic paid server fallback.

### P1: Payment harness

Use test-mode Stripe with a seller fixture and webhook signing secret stored outside source control. Cover successful and rejected payment, duplicate/reordered webhook delivery, forged webhook, another buyer's download request, expired URL and refund handling. Do not use card checkout to disguise token trading. Production payment readiness remains separate from arcade readiness.

### P2: AI publishing API

Offer draft creation, manifest validation, isolated build, preview and publication receipt endpoints. Use scoped expiring tokens, idempotency keys and readable error codes. AI can prepare releases; it cannot grant itself rights, claim QA completion or sign wallet transactions. Good failure messages should tell it the exact missing artifact and next step.

### P2: Token launch harness

Keep token tests separate from game tests. Validate signed ownership, correct chain, fixed supply, vesting, actual DEX addresses, pool funding and lock proof. Local EVM passing is insufficient. Require testnet receipts before proposing mainnet calldata, with fees and liquidity separately displayed.

## Definition of done

A game is ready only when it runs the claimed release, passes its device and interaction tests, stays within agreed costs, has valid rights, and the deployed version is verified. A source sale additionally needs entitlement tests. A token additionally needs chain-specific launch evidence. Report each dimension separately so one passing component cannot conceal another unfinished component.
