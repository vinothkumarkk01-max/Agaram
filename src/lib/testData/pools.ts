/**
 * Word pools for the bulk test-profile generator
 * (`api/dev/seed-bulk-profiles`). Deliberately NOT caste-associated
 * surnames (Iyer/Pillai/Chettiar/Nadar/Gounder/Mudaliar and similar) —
 * this app already treats community/caste as an optional, never-
 * inferred free-text field (see `profiles.community` and
 * `saveBackgroundInfo()`'s comment in `app/actions/profile.ts`), and
 * baking a caste signal into 200 fake names would quietly work
 * against that. Every name here is a plain given-name + a neutral
 * second word, in the common Tamil Nadu two-word-name style, with no
 * community, religious, or caste signal attached.
 */

export const MALE_FIRST_NAMES = [
  "Arun", "Bala", "Chandran", "Dinesh", "Elango", "Gowtham", "Hari", "Ilango",
  "Jeyakumar", "Karthik", "Lokesh", "Manikandan", "Naveen", "Prabhu", "Rajesh",
  "Saravanan", "Suresh", "Tamilselvan", "Vignesh", "Yogesh", "Ashwin", "Bhuvan",
  "Deepak", "Ganesh", "Harish", "Kavin", "Madhavan", "Nithin", "Pradeep",
  "Rithvik", "Sathish", "Vasanth", "Vetri", "Aravind", "Bharath", "Dinakaran",
  "Ezhil", "Gokul", "Hariharan", "Iniyan", "Jagan", "Kannan", "Logesh", "Mohan",
  "Nandakumar", "Pandian", "Ragul", "Selvam", "Thiru", "Vimal",
] as const;

export const FEMALE_FIRST_NAMES = [
  "Abinaya", "Bhavani", "Chitra", "Deepa", "Eswari", "Gayathri", "Hema",
  "Indira", "Janani", "Kalyani", "Lakshmi", "Malar", "Nandhini", "Padma",
  "Radhika", "Saranya", "Tamilarasi", "Uma", "Vaishnavi", "Yamuna", "Anitha",
  "Bhuvaneshwari", "Divya", "Elakkiya", "Gomathi", "Harini", "Ilakkiya",
  "Jothi", "Kavitha", "Latha", "Meena", "Nithya", "Priya", "Ranjani",
  "Sangeetha", "Thangam", "Usha", "Vani", "Yazhini", "Amudha", "Banu",
  "Devika", "Esther", "Geetha", "Hemalatha", "Ilamathi", "Jayanthi",
  "Keerthana", "Lavanya", "Malathi", "Nila",
] as const;

// Shared second-word pool — used for BOTH genders, same reasoning as
// the first-name split: nothing here carries a community/caste signal.
export const SECOND_NAMES = [
  "Kumar", "Raj", "Prakash", "Prasad", "Varma", "Sundaram", "Dharshini",
  "Varshini", "Preetha", "Vardhan", "Bharathi", "Selvi", "Arasi", "Mani",
  "Devi", "Nandan", "Krishnan", "Narayanan", "Subramani", "Venkatesh",
  "Ganesan", "Sekar", "Rajan", "Shankar", "Vijay", "Anand", "Ramesh",
  "Mahesh", "Elavarasan", "Thangam", "Kalidas", "Baskaran", "Jothilakshmi",
  "Meiyarasu", "Velmurugan", "Chezhian", "Adhithya", "Sriram", "Vetrivel",
  "Anbarasan",
] as const;

// Cities a Tamil matrimonial platform's own PRD already names as
// examples (Chennai) plus other major Tamil Nadu cities and a couple
// of common diaspora hubs — matches the flavor of preferred_locations
// examples already used elsewhere in this codebase (BasicInfoForm's
// "Chennai" placeholder, PreferencesForm's "Chennai, Bengaluru,
// Coimbatore").
export const LOCATIONS = [
  "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
  "Tirunelveli", "Vellore", "Erode", "Thanjavur", "Dindigul", "Karur",
  "Cuddalore", "Villupuram", "Nagercoil", "Thoothukudi", "Kanchipuram",
  "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Toronto", "Singapore",
] as const;

// Purely geographic (a district name), never a community/caste marker.
export const NATIVE_DISTRICTS = [
  "Chennai", "Coimbatore", "Madurai", "Thanjavur", "Salem", "Tirunelveli",
  "Vellore", "Erode", "Kanyakumari", "Dindigul", "Namakkal", "Cuddalore",
  "Villupuram", "Karur", "Sivagangai",
] as const;

export const ABOUT_ME_LINES = [
  "Enjoys long-distance running, close to family.",
  "Working in IT, loves weekend treks with friends.",
  "A classical Carnatic music enthusiast who also codes for a living.",
  "Runs a small home bakery on weekends — ask me about the cakes.",
  "Big fan of Tamil cinema, especially the old classics.",
  "Recently took up badminton; still losing most matches, still having fun.",
  "Believes in a quiet, honest life — books over parties, most days.",
  "Loves cooking for family and friends; south Indian breakfast is my specialty.",
  "A doctor by profession, a terrible singer by hobby.",
  "Enjoys travelling — Tamil Nadu's temple towns first, the rest of the world next.",
  "Spends most weekends volunteering at a local school.",
  "Cricket on Sundays, spreadsheets on weekdays.",
  "Learning classical dance again after a long break.",
  "A homebody who reads a lot and cooks even more.",
  "Works in finance, unwinds by gardening on the terrace.",
  "Fond of long conversations over filter coffee.",
  "An engineer who still prefers handwritten notes to apps — mostly.",
  "Enjoys photography, especially candid shots at family functions.",
  "Believes family comes first, career close behind.",
  "A teacher who loves the classroom more than the staff room.",
] as const;

export function pick<T>(pool: readonly T[], index: number): T {
  return pool[((index % pool.length) + pool.length) % pool.length];
}

/**
 * A tiny deterministic PRNG (mulberry32) — used instead of Math.random()
 * so re-running the seed route with the same offset always produces the
 * exact same profile, which is what makes the "safe to call more than
 * once" idempotency (see the route's own doc comment) actually hold for
 * the bulk generator too.
 */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
