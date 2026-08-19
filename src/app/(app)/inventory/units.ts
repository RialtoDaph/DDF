// Common bar/hotel inventory units, offered as suggestions via a <datalist>
// rather than a rigid enum — the DB column stays free text so an unusual
// unit typed once doesn't need a migration to become allowed.
export const UNIT_SUGGESTIONS = ["cl", "ml", "l", "g", "kg", "Stk.", "Flasche", "Kiste", "Portion"];
