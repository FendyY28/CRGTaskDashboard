import { TestingConsole } from "../../components/features/testing/TestingConsole";
import { SDLC_PHASES } from "../../constants/projectConstants";

/** UAT (User Acceptance Testing) execution console. */
export function TestingStatus() {
  return <TestingConsole phase={SDLC_PHASES.UAT} ns="testing" />;
}
