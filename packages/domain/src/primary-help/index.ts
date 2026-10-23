/** Help panel events and the system help report (track primary_in_app_help_20261023, FR-11 and FR-12). */
export {
  helpEventReportInput,
  helpEventReportOutput,
  helpVideoIdSchema,
  recordHelpEventInput,
  recordHelpEventOutput,
  type HelpEventReport,
  type HelpEventReportInput,
  type RecordHelpEventInput,
  type RecordHelpEventOutput,
} from "./contracts.js";
export { HELP_EVENT_RECORD, HELP_REPORT_READ } from "./permissions.js";
export { HELP_REPORT_PAGE_LIMIT, helpEventReport, recordHelpEvent } from "./events.js";
