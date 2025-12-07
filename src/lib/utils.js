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
    // User request: remove _, ., ,, - and replace with space. Handle multiple occurrences.
    // Regex: Match any sequence of one or more [ _ . , - ]
    base = base.replace(/[_\.,-]+/g, ' ');

    // Specific removals requested: "ALGRAWANY" (case insensitive) and "(1)", "(2)", etc.
    // Remove "ALGRAWANY"
    base = base.replace(/algrawany/gi, '');

    // Remove (number) e.g. (1), (25)
    base = base.replace(/\(\d+\)/g, '');

    // Remove trailing "From", "By" ...
    // Case insensitive
    base = base.replace(/\s+(from|by|at|via)\s*$/i, '');

    // Collapse spaces
    base = base.replace(/\s+/g, ' ').trim();

    return base; // We often don't want the extension in the Title field for the key 'title', generally.
    // Wait, the original code returned `base + ext`.
    // If the user is renaming files, they might want the extension.
    // But for "Title", visually we often hide extension.
    // However, looking at the app, it's used for "Title Suggester" and "Search -> Add".
    // If I add "book.pdf", the title usually is "book".
    // The previous code returned `base + ext`. 
    // Let's stick to returning `base` ONLY if we want to strip extension, but usually "Title" doesn't have .pdf.
    // The user example "Kundu's...2023" has no extension.
    // If I look at the original code lines 26-28: `ext = name.substring(extIndex);`.
    // If I return `base + ext`, I re-append .pdf.
    // If the user wants to clean the title for display/storage, usually we remove extension?
    // Let's check line 41 of original: `return base + ext;`.
    // I will preserve this behavior but the user asked to remove dots. 
    // If I preserve extension, `My.Book.pdf` -> `My Book.pdf`. Correct.

    return base + ext;
}
