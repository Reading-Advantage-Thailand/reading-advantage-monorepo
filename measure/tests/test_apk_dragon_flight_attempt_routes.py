"""Fail-closed route wiring acceptance for the Dragon Flight attempt protocol."""

from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
HOST_APPS = ("reading-advantage", "primary-advantage")


def source(path: Path) -> str:
    """Returns UTF-8 source text and fails with the missing required boundary."""
    if not path.exists():
        raise AssertionError(f"required Dragon Flight attempt route is missing: {path.relative_to(REPO_ROOT)}")
    return path.read_text(encoding="utf-8")


class DragonFlightAttemptRouteTests(unittest.TestCase):
    """Ensures both hidden hosts use the shared server-owned attempt protocol."""

    def test_both_hosts_issue_authenticated_tenant_scoped_attempts(self) -> None:
        """Requires an explicit issue route rather than browser-authored prompts or tokens."""
        for app in HOST_APPS:
            route_path = (
                REPO_ROOT
                / "apps"
                / app
                / "app/api/host-proof/games/attempts/route.ts"
            )
            route = source(route_path)
            for required in (
                "export async function POST",
                "isHostProofEnabled",
                "getCurrentUser",
                "createTenantDB",
                "issueDragonFlightHostProofAttempt",
            ):
                self.assertIn(required, route, f"{app} attempt route must contain {required}")
            self.assertNotIn(
                "recordHostProofGameCompletion",
                route,
                f"{app} attempt route must not bypass issuance through legacy completion",
            )

    def test_both_hosts_complete_only_signed_action_transcripts(self) -> None:
        """Forbids routing browser-authored score/XP objects into persistence."""
        for app in HOST_APPS:
            route_path = (
                REPO_ROOT
                / "apps"
                / app
                / "app/api/host-proof/games/completions/route.ts"
            )
            route = source(route_path)
            for required in (
                "completeDragonFlightHostProofAttempt",
                "getCurrentUser",
                "createTenantDB",
            ):
                self.assertIn(required, route, f"{app} completion route must contain {required}")
            self.assertNotIn(
                "recordHostProofGameCompletion",
                route,
                f"{app} completion route must not call the client-result legacy adapter",
            )
            self.assertNotIn(
                "HostProofCompletionRequest",
                route,
                f"{app} completion route must not cast a browser completion object as trusted",
            )

    def test_both_clients_obtain_attempts_and_never_construct_result_metrics(self) -> None:
        """Makes the route contract observable at the actual browser transport boundary."""
        forbidden_fragments = (
            "score: state.correctAnswers * 100",
            "accuracy: state.correctAnswers / state.totalAttempts",
            "correctAnswers: state.correctAnswers",
            "totalAttempts: state.totalAttempts",
            "duration: 1000",
            "victory: true",
        )
        for app in HOST_APPS:
            component_path = (
                REPO_ROOT
                / "apps"
                / app
                / "components/host-proof/HostProofGameClient.tsx"
            )
            component = source(component_path)
            self.assertIn(
                "/api/host-proof/games/attempts",
                component,
                f"{app} client must obtain an authenticated server-issued attempt",
            )
            for forbidden in forbidden_fragments:
                self.assertNotIn(
                    forbidden,
                    component,
                    f"{app} client must not construct {forbidden} for persistence",
                )


if __name__ == "__main__":
    unittest.main()
