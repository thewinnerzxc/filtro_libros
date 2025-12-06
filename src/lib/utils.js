export function cleanTitle(filename) {
    if (!filename) return '';
    // 1. Replace underscores/dots (except last dot) with spaces
    // Actually usually filename has extension.
    // Logic: 
    // - Remove common "garbage" suffixes if known?
    // - Replace _ with space
    // - Remove multiple spaces

    let name = filename;

    // Replace underscores
    name = name.replace(/_/g, ' ');

    // Remove "From.pdf" or similar if they appear? 
    // User example: "Echocardiography_in_Pediatric_and_Congenital_Heart_Disease_From.pdf"
    // -> "Echocardiography in Pediatric and Congenital Heart Disease.pdf"
    // It seems "From" at the end (before extension) is removed.

    // Regex to remove " From" or " By" etc before extension?
    // Let's do simple heuristics.
    const extIndex = name.lastIndexOf('.');
    let ext = '';
    let base = name;
    if (extIndex > 0) {
        ext = name.substring(extIndex);
        base = name.substring(0, extIndex);
    }

    // Clean base
    base = base.replace(/_/g, ' ');
    base = base.replace(/\./g, ' '); // Replace dots in name with space? Usually yes except extension.

    // Remove trailing "From", "By" ...
    // Case insensitive
    base = base.replace(/\s+(from|by|at|via)\s*$/i, '');

    // Collapse spaces
    base = base.replace(/\s+/g, ' ').trim();

    return base + ext;
}
