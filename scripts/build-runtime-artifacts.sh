#!/usr/bin/env bash
set -euo pipefail

export CARGO_INCREMENTAL="${CARGO_INCREMENTAL:-0}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

if [[ -z "${RUSTC_WRAPPER:-}" ]] && command -v sccache >/dev/null 2>&1; then
  export RUSTC_WRAPPER=sccache
fi

if [[ "${SKIP_PNPM_INSTALL:-0}" != "1" ]]; then
  pnpm install --frozen-lockfile
fi
pnpm --filter @ink-battles/auth-panel build
pnpm --filter @ink-battles/frontend build
pnpm --filter @ink-battles/backend build
pnpm --filter @ink-battles/backend exec bun build src/index.ts --target=bun --outdir dist
rm -rf apps/backend/dist/prompts
cp -R apps/backend/src/constants/other/prompts apps/backend/dist/prompts

(
  cd apps/auth
  cargo build --release
)

if command -v sccache >/dev/null 2>&1; then
  sccache --show-stats || true
fi
