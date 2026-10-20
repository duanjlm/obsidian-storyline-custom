 
import { FilterPreset, SceneFilter, SortConfig } from './Scene';

/**
 * Represents a StoryLine project file.
 *
 * A project lives as a markdown file directly inside the StoryLine root folder
 * (e.g. `StoryLine/My Novel.md`) and owns a subfolder tree:
 *
 *   StoryLine/My Novel/Scenes/
 *   StoryLine/My Novel/Codex/
 *   StoryLine/My Novel/Codex/Characters/
 *   StoryLine/My Novel/Codex/Locations/
 *
 * Legacy projects may have Characters/ and Locations/ at the project root;
 * the runtime detects this and uses the old paths transparently.
 */
export interface StoryLineProject {
    /** Vault-relative path of the project .md file */
    filePath: string;
    /** Human-readable title (from frontmatter or filename) */
    title: string;
    /** ISO date string when the project was created */
    created: string;
    /** Description / notes (body of the .md file) */
    description: string;
    /**
     * Optional BCP-47 language tag for this project (`'en'`, `'sv'`, `'zh'`, `'ja'`, …).
     * Drives word counting, reading time, dialogue %, stop-word filtering, and PDF
     * line wrapping. `'auto'` enables script auto-detection from manuscript text.
     */
    locale?: string;
    /** Derived base folder path (empty string for vault root) */
    baseFolder?: string;
    /** Derived scene folder path */
    sceneFolder: string;
    /** Derived character folder path */
    characterFolder: string;
    /** Derived location folder path */
    locationFolder: string;
    /** Derived codex folder path (generic codex categories live here) */
    codexFolder: string;
    /** Derived notes folder path (corkboard sticky notes live here) */
    notesFolder: string;
    /** Derived scene notes folder path (external per-scene notes files) */
    sceneNotesFolder: string;
    /** Derived archive folder path (archived / cut scenes) */
    archiveFolder: string;
    /** Derived research folder path (research posts) */
    researchFolder: string;

    // ── Project-specific structure ──────────────────────
    /** Defined act numbers (persisted in project frontmatter) */
    definedActs: number[];
    /** Defined chapter numbers (persisted in project frontmatter) */
    definedChapters: number[];
    /** Human-readable labels for acts / beats (act number → label, e.g. 1 → "Opening Image") */
    actLabels: Record<number, string>;
    /** Human-readable labels for chapters (chapter number → label, e.g. 1 → "Opening Image") */
    chapterLabels: Record<number, string>;
    /** Optional descriptions for acts (act number → description text) */
    actDescriptions: Record<number, string>;
    /** Optional descriptions for chapters (chapter number → description text) */
    chapterDescriptions: Record<number, string>;
    /** Saved filter presets (persisted in project frontmatter) */
    filterPresets: FilterPreset[];
    /** Last active Manuscript filter (persisted in project frontmatter) */
    manuscriptFilter?: SceneFilter;
    /** Last Manuscript sort (persisted in project frontmatter) */
    manuscriptSort?: SortConfig;
    /** Corkboard free-position layout (scene file path -> coordinates + layer order + optional height) */
    corkboardPositions: Record<string, { x: number; y: number; z?: number; h?: number }>;

    // ── Series ──────────────────────────────────────
    /** Optional series ID — links this project to a series (matches series.json name) */
    seriesId?: string;
    /** Stable UUID identity for this book. Legacy projects receive one on scan. */
    bookId?: string;
    /** Stable UUID identity for the series; seriesId remains for legacy compatibility. */
    seriesUuid?: string;
    /** Vault-relative path to a cover image for the project */
    coverImage?: string;
    /** Name of the last applied beat sheet template */
    activeBeatSheet?: string;
}

// ── Series metadata ────────────────────────────────

/**
 * Represents a series — a group of book projects sharing a common codex.
 * Persisted as `series.json` in the series parent folder.
 */
export interface SeriesMetadata {
    /** Display name of the series */
    name: string;
    /** Stable UUID identity for the series. */
    seriesUuid?: string;
    /** Ordered list of book folder names within the series folder */
    bookOrder: string[];
    /** Ordered list of stable book UUIDs parallel to bookOrder. */
    bookIds?: string[];
    /** ISO date string when the series was created */
    created: string;
}

/**
 * Safely join a base folder and subfolder without leading, trailing, or double slashes.
 * When base is empty (e.g. vault root), subfolder is returned directly without a leading slash.
 */
export function joinProjectPath(base: string, sub: string): string {
    const cleanBase = (base || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
    const cleanSub = (sub || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
    if (!cleanBase) return cleanSub;
    if (!cleanSub) return cleanBase;
    return `${cleanBase}/${cleanSub}`;
}

/**
 * Build derived folder paths from a root folder and project title.
 * When title is omitted or matches the rootFolder, rootFolder itself is used as the base.
 * Avoids redundant nested subfolders and leading slashes for vault root.
 */
export function deriveProjectFolders(
    rootFolder: string,
    title?: string
): { baseFolder: string; sceneFolder: string; characterFolder: string; locationFolder: string; codexFolder: string; notesFolder: string; sceneNotesFolder: string; archiveFolder: string; researchFolder: string } {
    const cleanRoot = (rootFolder || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
    const cleanTitle = (title || '').replace(/[\\/:*?"<>|]/g, '-').trim();

    // If cleanTitle is provided and cleanRoot doesn't already end with cleanTitle,
    // nest under cleanTitle only when cleanRoot is not intended as the exact project root.
    const baseFolder = cleanTitle
        ? (cleanRoot ? (cleanRoot.endsWith(`/${cleanTitle}`) || cleanRoot === cleanTitle ? cleanRoot : `${cleanRoot}/${cleanTitle}`) : cleanTitle)
        : cleanRoot;

    return {
        baseFolder,
        sceneFolder: joinProjectPath(baseFolder, 'Scenes'),
        characterFolder: joinProjectPath(baseFolder, 'Codex/Characters'),
        locationFolder: joinProjectPath(baseFolder, 'Codex/Locations'),
        codexFolder: joinProjectPath(baseFolder, 'Codex'),
        notesFolder: joinProjectPath(baseFolder, 'Notes'),
        sceneNotesFolder: joinProjectPath(baseFolder, 'SceneNotes'),
        archiveFolder: joinProjectPath(baseFolder, 'Archive'),
        researchFolder: joinProjectPath(baseFolder, 'Research'),
    };
}

/**
 * Derive project folder paths from the project .md file's actual location.
 * Works for projects anywhere in the vault — including the vault root (empty baseFolder)
 * or any custom directory, without forcing redundant nested subdirectories.
 *
 * The directory containing the project .md file directly serves as the project base:
 *  - Vault root:    `MyNovel.md`          → base = `""`, scenes = `Scenes`
 *  - Custom folder: `Writing/MyNovel.md`  → base = `Writing`, scenes = `Writing/Scenes`
 *  - Project dir:   `Novels/Book1/Book.md`→ base = `Novels/Book1`, scenes = `Novels/Book1/Scenes`
 */
export function deriveProjectFoldersFromFilePath(
    filePath: string
): { baseFolder: string; sceneFolder: string; characterFolder: string; locationFolder: string; codexFolder: string; notesFolder: string; sceneNotesFolder: string; archiveFolder: string; researchFolder: string } {
    const normalized = filePath.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    const parentDir = lastSlash >= 0 ? normalized.substring(0, lastSlash).trim() : '';
    const baseFolder = parentDir.replace(/^\/+|\/+$/g, '');

    return {
        baseFolder,
        sceneFolder: joinProjectPath(baseFolder, 'Scenes'),
        characterFolder: joinProjectPath(baseFolder, 'Codex/Characters'),
        locationFolder: joinProjectPath(baseFolder, 'Codex/Locations'),
        codexFolder: joinProjectPath(baseFolder, 'Codex'),
        notesFolder: joinProjectPath(baseFolder, 'Notes'),
        sceneNotesFolder: joinProjectPath(baseFolder, 'SceneNotes'),
        archiveFolder: joinProjectPath(baseFolder, 'Archive'),
        researchFolder: joinProjectPath(baseFolder, 'Research'),
    };
}

 
