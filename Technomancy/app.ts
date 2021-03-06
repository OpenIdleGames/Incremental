﻿/// <reference path ="events.ts" />
/// <reference path ="spells.ts" />

declare var $: any;
declare var numberformat: any;

function format_num(num: number, show_decimals: boolean = true): string {
    /* If our numberformatting library broke, we fallback to a terrible option instead. This should really only happen in development when it's being worked on online, so it doesn't matter too much.*/
    if (typeof numberformat == "undefined") {
        return Math.round(num).toString();
    }

    if (isNaN(num)) { return "fuzzy"; }
    if (num < 0) { return "-" + format_num(-num, show_decimals); }
    if (num == Infinity) { return "Yes"; }

    if (num < 100000) { /* Show more precise values if we aren't going to numberformat*/
        if (show_decimals) {
            return (Math.round(num * 1000) / 1000).toString();
        } else {
            return Math.round(num).toString()
        }
    } else {
        if (show_decimals) {
            return numberformat.formatShort(num, { sigfigs: 5 });
        } else {
            return numberformat.formatShort(num, { sigfigs: 3 });
        }
    }
}
var resources = {};
var resources_per_sec = {};
var buildings = {};
var purchased_upgrades = []; /* Names of all purchased upgrades */
var remaining_upgrades = {}; /* All remaining upgrades that need to be purchased */
const UNLOCK_TREE = { /* What buildings unlock */
    "s_manastone": [],
    "s_mana_refinery": [],
    "s_goldboost": [],
    "s_energyboost": [],
    "s_trade": [],
    "s_startboost": [],
    "s_time_magic": [],
    "s_workshop": [],
    "s_time_maker": [],
    "s_workshop_2": [],
    "s_final": [],

    "bank": ["mine", "logging"],
    "oil_well": ["oil_engine"],
    "library": ["water_purifier", "solar_panel"],
    "water_purifier": ["hydrogen_gen", "hydrogen_burner"],
    "skyscraper": ["big_bank"],

    "oil_engine": ["paper_mill", "ink_refinery", "s_energyboost"],
    "solar_panel": [],
    "hydrogen_burner": [],
    "reactor": ["fuel_maker"],

    "mine": ["furnace", "gold_finder"],
    "logging": ["compressor"],
    "furnace": [],
    "gold_finder": ["jeweler"],
    "compressor": ["oil_well"],
    "jeweler": ["jewelry_store"],
    "glass_jeweler": ["jewelry_store"],
    "jewelry_store": [],

    "paper_mill": ["money_printer"],
    "ink_refinery": [],
    "money_printer": ["book_printer"],
    "book_printer": ["library"],
    "hydrogen_gen": [],
    "fuel_maker": [],
    "magnet": ["steel_smelter"],
    "book_boost": [],
    "steel_smelter": [],
    "mithril_smelter": ["drill"],
    "drill": [],

    "big_bank": ["big_mine"],
    "big_mine": [],

    "hydrogen_mine": [],
    "mana_purifier": [],
};
const SPELL_BUILDINGS = [
    "s_manastone",
    "s_goldboost",
    "s_energyboost",
    "s_trade",
    "s_startboost",
    "s_time_magic",
    "s_workshop",
    "s_time_maker",
    "s_mana_refinery",
    "s_workshop_2",
    "s_final",
  ];

function set_initial_state() {
    /*
        Each resource has a few different fields:
            amount: How many they have. This is the ONLY field stored on save/load
            value: How much it's worth (for prestige or otherwise).
            mult: The per-second multiplier. (Amount per second is stored elsewhere because bad design decisions). If you have +10/s and a mult of 2, you actually get +20/s. Only is applied for positive net changes.
            changes: List of [string, value] elements. Tracks what's modifying the /s gain to be displayed later. TODO: Actually do stuff with this. 
    */
    resources = {
        "time": { "amount": 0, "value": -2, "mult": 1, "changes": {}, "ps_change": "" },
        "refined_mana": { "amount": 0, "value": -1, "mult": 1, "changes": {}, "ps_change": "" },
        "purified_mana": { "amount": 0, "value": -2500, "mult": 1, "changes": {}, "ps_change": "" },
        "fuel": { "amount": 0, "value": -1000, "mult": 1, "changes": {}, "ps_change": "" },

        "mana": { "amount": 0, "value": 0, "mult": 1, "changes": {}, "ps_change": "" },
        "energy": { "amount": 0, "value": 0, "mult": 1, "changes": {}, "ps_change": "" }, 
        "research": { "amount": 0, "value": 0, "mult": 1, "changes": {}, "ps_change": "" },
        "manager": { "amount": 0, "value": 0, "mult": 1, "changes": {}, "ps_change": "" },
        "sludge": { "amount": 0, "value": 0, "mult": 1, "changes": {}, "ps_change": "" },

        "money": { "amount": 10, "value": 1, "mult": 1, "changes": {}, "ps_change": "" },
        "stone": { "amount": 0, "value": 0.5, "mult": 1, "changes": {}, "ps_change": "" },
        "wood": { "amount": 0, "value": 0.5, "mult": 1, "changes": {}, "ps_change": "" },
        "iron_ore": { "amount": 0, "value": 1, "mult": 1, "changes": {}, "ps_change": "" },
        "coal": { "amount": 0, "value": 1, "mult": 1, "changes": {}, "ps_change": "" },
        "iron": { "amount": 0, "value": 4, "mult": 1, "changes": {}, "ps_change": "" },
        "gold": { "amount": 0, "value": 50, "mult": 1, "changes": {}, "ps_change": "" },
        "diamond": { "amount": 0, "value": 75, "mult": 1, "changes": {}, "ps_change": "" },
        "jewelry": { "amount": 0, "value": 300, "mult": 1, "changes": {}, "ps_change": "" },
        "oil": { "amount": 0, "value": 2, "mult": 1, "changes": {}, "ps_change": "" },
        "paper": { "amount": 0, "value": 4, "mult": 1, "changes": {}, "ps_change": "" },
        "ink": { "amount": 0, "value": 10, "mult": 1, "changes": {}, "ps_change": "" },
        "book": { "amount": 0, "value": 400, "mult": 1, "changes": {}, "ps_change": "" },
        "sand": { "amount": 0, "value": 2, "mult": 1, "changes": {}, "ps_change": "" },
        "glass": { "amount": 0, "value": 20, "mult": 1, "changes": {}, "ps_change": "" },
        "water": { "amount": 0, "value": 2, "mult": 1, "changes": {}, "ps_change": "" },
        "hydrogen": { "amount": 0, "value": 5, "mult": 1, "changes": {}, "ps_change": "" },
        "steel_beam": { "amount": 0, "value": 200, "mult": 1, "changes": {}, "ps_change": "" },
        "uranium": { "amount": 0, "value": 500, "mult": 1, "changes": {}, "ps_change": "" },
        "sandcastle": { "amount": 0, "value": 5000000, "mult": 1, "changes": {}, "ps_change": "" }, /* Value for these is weird when prestiging. */
        "glass_bottle": { "amount": 0, "value": 25000, "mult": 1, "changes": {}, "ps_change": "" }, /* Not much above glass value, but they're useful! */
        "mithril": { "amount": 0, "value": 3500, "mult": 1, "changes": {}, "ps_change": "" },
        "void": { "amount": 0, "value": 100000, "mult": 1, "changes": {}, "ps_change": "" }, /* Actually less than the fuel that goes into it. */

    };
    /* Set resources_per_sec */
    Object.keys(resources).forEach(function (res) {
        resources_per_sec[res] = 0;
    });
    buildings = {
        "s_manastone": {
            "on": true,
            "amount": 0,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": 1,
            },
            "multipliers": {

            },
            "update": "nop",
            "free": 0,
            "flavor": "A stone made out of pure crystallized mana. Use it to power spells!",
        },
        "s_mana_refinery": {
            "on": true,
            "amount": 1,
            "base_cost": {},
            "price_ratio": {},
            "generation": {
                "mana": 0,
            },
            "multipliers": {

            },
            "update": "refinery",
            "free": 0,
            "flavor": "That's some fine mana.",
        },
        "s_goldboost": {
            "on": false,
            "amount": 2,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "multipliers": {
                "money": 0.5, /* There's 2 of them, so this totals to 100% boost. */
                "gold": 0.5,
            },
            "update": "nop",
            "free": 0,
            "flavor": "A magic spell made for tax fraud.",
        },
        "s_energyboost": {
            "on": false,
            "amount": 1,
            "base_cost": { "mana": 0 },
            "price_ratio": { "mana": 0 },
            "generation": {
                "mana": -3,
                "energy": 1,
            },
            "multipliers": {

            },
            "update": "nop",
            "free": 0,
            "flavor": "This is actually a much simpler spell than the name implies.",
        },
        "s_trade": {
            "on": false,
            "amount": 6,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "multipliers": {

            },
            "update": "trade",
            "free": 0,
            "flavor": "With an infinite variety of things, you would think you could find some apples for sale. But you can't.",
        },
        "s_startboost": {
            "on": false,
            "amount": 25,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
                "money": 1,
                "stone": 2,
                "wood": 2,
                "iron_ore": 5/25,
                "oil": .5/25,
            },
            "multipliers": {

            },
            "update": "nop",
            "free": 0,
            "flavor": "I HAVE THE POWER!",
        },
        "s_time_magic": {
            "on": false,
            "amount": 40,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "multipliers": {

            },
            "update": "time",
            "free": 0,
            "flavor": "I HAVE THE POWER!",
        },
        "s_workshop": {
            "on": false,
            "amount": 50,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "multipliers": {

            },
            "update": "nop",
            "mode": "iron",
            "free": 0,
            "flavor": "Yay, you can read my code.",
        },
        "s_time_maker": {
            "on": false,
            "amount": 100,
            "base_cost": {},
            "price_ratio": {},
            "generation": {
                "mana": -1,
                "time": 0.2/100,
            },
            "multipliers": {

            },
            "update": "nop",
            "free": 0,
            "flavor": "Yay herbs! Thyme is good!",
        },
        "s_workshop_2": {
            "on": false,
            "amount": 200,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "multipliers": {

            },
            "update": "workshop",
            "free": 0,
            "flavor": "Work. Work. Work. Work. Shop.",
        },
        "s_final": {
            "on": false,
            "amount": 500,
            "base_cost": {},
            "price_ratio": {},
            "generation": {
                "mana": -1,
            },
            "multipliers": {

            },
            "update": "final",
            "strength": 2,
            "free": 0,
            "flavor": "MORE MANA!",
        },

        "bank": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 10,
            },
            "price_ratio": {
                "money": 1.1,
            },
            "generation": {
                "money": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "It's a pretty small branch bank.",
        },
        "oil_well": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 1000,
                "stone": 1000,
                "iron": 500
            },
            "price_ratio": {
                "money": 1.2,
                "stone": 1.1,
                "iron": 1.3,
            },
            "generation": {
                "oil": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Well, this gets you oil.",
        },
        "library": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "wood": 2500,
                "iron": 50,
                "book": 10,
            },
            "price_ratio": {
                "money": 1.2,
                "iron": 1.4,
                "wood": .95,
                "book": 1.1,
            },
            "generation": {
                "research": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "They do very important research here. <br />DO NOT DISTURB THE LIBRARIANS.",
        },
        "water_purifier": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "stone": 500,
                "sand": 500,
                "glass": 100,
            },
            "price_ratio": {
                "money": 1.1,
                "stone": 1.1,
                "sand": 1.1,
                "glass": 1.1,
            },
            "generation": {
                "water": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "To find sand, first you must collect 10 mana.",
        },
        "skyscraper": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 5000,
                "steel_beam": 25,
                "glass": 50,
            },
            "price_ratio": {
                "money": 1.09,
                "steel_beam": 1.1,
                "glass": 1.1,
            },
            "generation": {
                "manager": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Only one per floor so they don't get in each others' ways.",
        },

        "oil_engine": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "iron": 200
            },
            "price_ratio": {
                "money": 1.3,
                "iron": 1.3,
            },
            "generation": {
                "oil": -1,
                "energy": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "",
        },
        "solar_panel": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 50000,
                "glass": 100,
                "coal": 100,
                "diamond": 100,
            },
            "price_ratio": {
                "money": .8,
                "glass": 2,
                "coal": 1.5,
                "diamond": 1.5,
            },
            "generation": {
                "energy": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Praise the sun!",
        },
        "hydrogen_burner": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "iron": 500,
            },
            "price_ratio": {
                "money": 1.1,
                "iron": 1.2,
            },
            "generation": {
                "hydrogen": -20,
                "energy": 15,
                "water": 7,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "FIRE!",
        },
        "reactor": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 1000000,
                "steel_beam": 100,
                "iron": 10000,
            },
            "price_ratio": {
                "money": 1.1,
                "steel_beam": 1.07,
                "iron": 1.2,
            },
            "generation": {
                "manager": -3,
                "uranium": -0.1,
                "water": -15,
                "energy": 50,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Don't let it go boom!",
        },

        "mine": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 15,
            },
            "price_ratio": {
                "money": 1.2,
            },
            "generation": {
                "money": -1,
                "stone": 1,
                "iron_ore": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "IT'S ALL MINE!",
        },
        "logging": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 15,
            },
            "price_ratio": {
                "money": 1.2,
            },
            "generation": {
                "money": -1,
                "wood": 1,
                "coal": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "console.log('Player read tooltip.')",
        },
        "furnace": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 200,
                "stone": 50,
            },
            "price_ratio": {
                "money": 1.1,
                "stone": 1.2,
            },
            "generation": {
                "wood": -5,
                "iron_ore": -3,
                "iron": 1,
                "coal": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Come on in! It's a blast!",
        },
        "gold_finder": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "stone": 1000,
                "wood": 400
            },
            "price_ratio": {
                "money": 1.3,
                "stone": 1.3,
                "wood": 1.2,
            },
            "generation": {
                "stone": -10,
                "gold": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "",
        },
        "compressor": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 100,
                "stone": 300,
                "iron": 100
            },
            "price_ratio": {
                "money": 1.3,
                "stone": 1.3,
                "iron": 1.3,
            },
            "generation": {
                "coal": -10,
                "diamond": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Running this machine is a high-pressure job.",
        },
        "jeweler": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 750,
                "stone": 1000,
            },
            "price_ratio": {
                "money": 1.3,
                "stone": 1.3,
            },
            "generation": {
                "gold": -3,
                "diamond": -1,
                "jewelry": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "A jeweler uses jewels to make jewelry in July.",
        },
        "glass_jeweler": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "glass": 300,
            },
            "price_ratio": {
                "money": 1.3,
                "glass": 1.3,
            },
            "generation": {
                "glass": -10,
                "jewelry": .5,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Oooooh.... shiny!",
        },
        "jewelry_store": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 5000,
                "stone": 500,
                "wood": 750
            },
            "price_ratio": {
                "money": 1.5,
                "stone": 1.4,
                "wood": 1.4,
            },
            "generation": {
                "jewelry": -1,
                "money": 400,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "100% free-range, non-GMO, organic jewelry!",
        },

        "paper_mill": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 200,
                "iron": 200,
                "oil": 100,
            },
            "price_ratio": {
                "money": 1.1,
                "iron": 1.1,
                "oil": 1.1
            },
            "generation": {
                "energy": -1,
                "wood": -3,
                "paper": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "",
        },
        "ink_refinery": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 200,
                "iron": 200,
                "oil": 100,
            },
            "price_ratio": {
                "money": 1.1,
                "iron": 1.1,
                "oil": 1.1
            },
            "generation": {
                "energy": -1,
                "oil": -3,
                "ink": 1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "",
        },
        "money_printer": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "iron": 500,
                "oil": 200,
            },
            "price_ratio": {
                "money": 1.2,
                "iron": 1.2,
                "oil": 1.3,
            },
            "generation": {
                "energy": -1,
                "paper": -2,
                "ink": -1,
                "money": 30,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "100% legal. Trust me on this.",
        },
        "book_printer": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 5000,
                "iron": 700,
                "oil": 500,
            },
            "price_ratio": {
                "money": 1.2,
                "iron": 1.2,
                "oil": 1.3,
            },
            "generation": {
                "energy": -1,
                "paper": -2,
                "ink": -1,
                "book": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "It's actually just printing a bunch of copies of My Immortal.",
        },
        "hydrogen_gen": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "glass": 500,
            },
            "price_ratio": {
                "money": 1.1,
                "glass": 1.2,
            },
            "generation": {
                "energy": -2,
                "water": -1,
                "hydrogen": 2,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Runs electricity through water...",
        },
        "fuel_maker": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 1500000,
                "steel_beam": 250,
                "iron": 50000,
                "gold": 3000,
                "research": 20,
            },
            "price_ratio": {
                "money": 1.1,
                "steel_beam": 1.07,
                "iron": 1.2,
                "gold": 1.1,
                "research": 1.2,
            },
            "generation": {
                "energy": -75,
                "uranium": -0.1,
                "hydrogen": -150,
                "refined_mana": -1,
                "fuel": 0.01,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "This fuel is... not healthy.",
        },
        "magnet": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "iron": 10000,
                "steel_beam": 500,
            },
            "price_ratio": {
                "iron": 1.1,
                "steel_beam": 1.1,
            },
            "generation": {

            },
            "multipliers": {
                "iron": 0.1,
                "iron_ore": 0.1,
            },
            "free": 0,
            "flavor": "It's just a big magnet.",
        },
        "book_boost": {
            "on": true,
            "amount": 0,
            "base_cost": {
            },
            "price_ratio": {
            },
            "generation": {
                "energy": -1,
                "book": -0.1,
            },
            "multipliers": {
                "book": 0.15
            },
            "free": 0,
            "flavor": "",
        },
        "steel_smelter": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "iron": 20000,
                "stone": 50000,
            },
            "price_ratio": {
                "iron": 1.1,
                "stone": 1.1,
            },
            "generation": {
                "manager": -1,
                "iron": -25, 
                "coal": -25,
                "steel_beam": 1, 
            },
            "multipliers": {
            },
            "free": 0,
            "flavor": "Hot hot hot!",
        },
        "mithril_smelter": {
            "on": true,
            "amount": 0,
            "base_cost": {
            },
            "price_ratio": {
            },
            "generation": {
                "manager": -1,
                "gold": -5,
                "refined_mana": -25,
                "mithril": 0.1,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "",
        },
        "drill": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "mithril": 50,
                "diamond": 10,
                "steel_beam": 100,
            },
            "price_ratio": {
                "mithril": 1.11,
                "diamond": 1.13,
                "steel_beam": 1.05,
            },
            "generation": {
                "water": -5,
                "energy": -5,
                "stone": 20,
                "diamond": 0.1,
                "iron_ore": 1,
            },
            "multipliers": {
                "iron_ore": 0.05
            },
            "free": 0,
            "flavor": "A massive, water-cooled drill to recover materials from the center of the earth. It's pretty bore-ing.",
        },

        "big_bank": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 25000,
                "stone": 25000,
                "glass": 100,
            },
            "price_ratio": {
                "money": 1.2,
                "stone": 1.1,
                "glass": 1.2,
            },
            "generation": {
                "manager": -1,
                "money": 50,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Serious business",
        },
        "big_mine": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 10000,
                "steel_beam": 100,
                "wood": 20000,
            },
            "price_ratio": {
                "money": 1.1,
                "steel_beam": 1.03,
                "wood": 1.1,
            },
            "generation": {
                "manager": -1,
                "money": -100,
                "stone": 30,
                "iron_ore": 10,
                "coal": 3,
                "iron": 2,
                "gold": .5,
                "diamond": .1,
                "sand": 10,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Seriouser business",
        },

        "hydrogen_mine": {
            "on": true,
            "amount": 0,
            "base_cost": { }, /* Free, but you can't buy it. */
            "price_ratio": { },
            "generation": {
                "hydrogen": 30,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "The moon rocks. And now you can have those rocks.",
        },
        "mana_purifier": {
            "on": true,
            "amount": 0,
            "base_cost": {}, /* Free, but you can't buy it. */
            "price_ratio": {},
            "generation": {
                "refined_mana": -1,
                "energy": -25,
                "mana": -50,
                "purified_mana": 0.001,
            },
            "multipliers": {

            },
            "free": 0,
            "flavor": "Makes purified mana.",
        },

    };
    purchased_upgrades = [];
    remaining_upgrades = {
        "better_mines": {
            "unlock": function () { return buildings["mine"].amount >= 3; },
            "purchase": function () { /* When bought, turn all mines off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let mines_state = buildings["mine"].on;
                if (mines_state) {
                    toggle_building_state("mine");

                }
                buildings["mine"]["generation"]["stone"] *= 2;
                buildings["mine"]["generation"]["iron_ore"] *= 5;
                if (mines_state) { /* Only turn on if it already was on */
                    toggle_building_state("mine");
                }
            },
            "cost": {
                "money": 2000,
                "stone": 500,
                "iron": 250,
            },
            "tooltip": "Mines produce double stone and 5x iron.",
            "name": "Improve Mines",
            "image": "pickaxe.png",
            "repeats": false,
        },
        "better_logging": {
            "unlock": function () { return buildings["logging"].amount >= 3 && buildings["s_manastone"].amount >= 5; },
            "purchase": function () { /* When bought, turn all mines off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let build_state = buildings["logging"].on;
                if (build_state) {
                    toggle_building_state("logging");

                }
                buildings["logging"]["generation"]["wood"] *= 2;
                buildings["logging"]["generation"]["coal"] *= 3;
                if (build_state) { /* Only turn on if it already was on */
                    toggle_building_state("logging");
                }
            },
            "cost": {
                "money": 2000,
                "wood": 500,
                "iron": 500,
            },
            "tooltip": "console.error('Upgrade not purchased, player needs to buy it!');<br /><i>(Provides an upgrade to logging camps)</i>",
            "name": "Magical Trees",
            "image": "",
            "repeats": false,
        },
        "cheaper_mines": {
            "unlock": function () { return buildings["mine"].amount >= 20; },
            "purchase": function () {
                buildings["mine"].price_ratio["money"] = 1.15;
            },
            "cost": {
                "stone": 5000,
                "money": 5000,
            },
            "tooltip": "Mines are cheaper to buy.",
            "name": "Mountain<br />",
            "image": "pickaxe.png",
            "repeats": false,
        },
        "cheaper_logging": {
            "unlock": function () { return buildings["logging"].amount >= 20; },
            "purchase": function () {
                buildings["logging"].price_ratio["money"] = 1.15;
            },
            "cost": {
                "wood": 5000,
                "money": 5000,
            },
            "tooltip": "Logging Camps are cheaper to buy.",
            "name": "Forest<br />",
            "image": "",
            "repeats": false,
        },
        "coal_mines": {
            "unlock": function () { return buildings["mine"].amount >= 3 && buildings["compressor"].amount >= 1 && (resources["coal"].amount < 50 || resources["research"].amount > 5); },
            "purchase": function () { /* When bought, turn all mines off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let mines_state = buildings["mine"].on;
                if (mines_state) {
                    toggle_building_state("mine");

                }

                if (event_flags["bribed_politician"] == "environment") {
                    buildings["mine"]["generation"]["coal"] = 2;
                } else {
                    buildings["mine"]["generation"]["coal"] = 0.2;
                }

                if (mines_state) { /* Only turn on if it already was on */
                    toggle_building_state("mine");
                }
            },
            "cost": {
                "money": 1000,
                "stone": 500,
                "wood": 500,
            },
            "tooltip": "Mines produce coal.",
            "name": "Coal Mining<br />",
            "image": "pickaxe.png",
            "repeats": false,
        },
        "better_compressors": {
            "unlock": function () { return buildings["compressor"].amount >= 1; },
            "purchase": function () { /* When bought, turn all compressors off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["compressor"].on;
                if (comp_state) {
                    toggle_building_state("compressor");

                }
                buildings["compressor"]["generation"]["coal"] *= 0.7;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("compressor");
                }
            },
            "cost": {
                "money": 3000,
                "iron": 1000,
            },
            "tooltip": "Compressors use 30% less coal.",
            "name": "Improve Compressors",
            "image": "diamond.png",
            "repeats": false,
        },
        "oiled_compressors": {
            "unlock": function () { return buildings["compressor"].amount >= 1 && resources["oil"].amount > 20; },
            "purchase": function () { /* When bought, turn all compressors off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["compressor"].on;
                if (comp_state) {
                    toggle_building_state("compressor");
                }
                buildings["compressor"]["generation"]["coal"] *= 0.9;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("compressor");
                }
            },
            "cost": {
                "oil": 50,
            },
            "tooltip": "Oil your compressors to have them run more efficiently.",
            "name": "Oil Compressors",
            "image": "diamond.png",
            "repeats": false,
        },
        "better_oil": {
            "unlock": function () { return buildings["oil_well"].amount >= 1; },
            "purchase": function () { /* When bought, turn all off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["oil_well"].on;
                if (comp_state) {
                    toggle_building_state("oil_well");
                }
                buildings["oil_well"]["generation"]["oil"] *= 5;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("oil_well");
                }
            },
            "cost": {
                "oil": 100,
            },
            "tooltip": "Get more oil for your wells.",
            "name": "Fracking",
            "image": "",
            "repeats": false,
        },
        "even_better_oil": {
            "unlock": function () { return purchased_upgrades.indexOf("better_oil") != -1; },
            "purchase": function () { /* When bought, turn all off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["oil_well"].on;
                if (comp_state) {
                    toggle_building_state("oil_well");
                }
                buildings["oil_well"]["generation"]["oil"] *= 2;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("oil_well");
                }
            },
            "cost": {
                "oil": 500,
                "research": 1,
            },
            "tooltip": "If it worked once, why not again?",
            "name": "More Fracking",
            "image": "",
            "repeats": false,
        },
        "cheaper_banks": {
            "unlock": function () { return resources["money"].amount >= 2500 && buildings["bank"].amount >= 20; },
            "purchase": function () { 
                buildings["bank"].price_ratio["money"] = (buildings["bank"].price_ratio["money"] - 1) * .7 + 1;
            },
            "cost": {
                "money": 5000,
                "iron": 1000,
            },
            "tooltip": "Banks are cheaper to buy.",
            "name": "Build a Vault <br />",
            "image": "money.png",
            "repeats": false,
        },
        "better_paper": {
            "unlock": function () { return buildings["paper_mill"].amount >= 3; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["paper_mill"].on;
                if (comp_state) {
                    toggle_building_state("paper_mill");

                }
                buildings["paper_mill"]["generation"]["paper"] *= 2;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("paper_mill");
                }
            },
            "cost": {
                "money": 10000,
                "iron": 1000,
                "oil": 500,
                "research": 5,
            },
            "tooltip": "Make thinner paper, creating double the paper per wood.",
            "name": "Thinner paper",
            "image": "gear.png",
            "repeats": false,
        },
        "better_furnace": {
            "unlock": function () { return buildings["furnace"].amount >= 3; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["furnace"].on;
                if (comp_state) {
                    toggle_building_state("furnace");

                }
                Object.keys(buildings["furnace"].generation).forEach(function (res) {
                    buildings["furnace"].generation[res] *= 10;
                });
                buildings["furnace"].generation["wood"] *= .7;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("furnace");
                }
            },
            "cost": {
                "money": 10000,
                "stone": 30000,
                "wood": 20000,
                "coal": 2000,
            },
            "tooltip": "Much hotter furnaces run at 10x the previous rate and consume slightly less wood.",
            "name": "Hotter Furnaces",
            "image": "fire.png",
            "repeats": false,
        },
        "better_gold": {
            "unlock": function () { return buildings["gold_finder"].amount >= 3; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["gold_finder"].on;
                if (comp_state) {
                    toggle_building_state("gold_finder");
                }
                buildings["gold_finder"].generation["gold"] *= 2;
                buildings["gold_finder"].generation["iron"] = 0.05;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("gold_finder");
                }
            },
            "cost": {
                "money": 25000,
                "gold": 500,
                "iron": 1000,
            },
            "tooltip": "Special gold-plated magnets that attract only gold. And a bit of iron.",
            "name": "Gold Magnet<br />",
            "image": "money.png",
            "repeats": false,
        },
        "better_hydrogen_engine": {
            "unlock": function () { return buildings["hydrogen_burner"].amount >= 1; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["hydrogen_burner"].on;
                if (comp_state) {
                    toggle_building_state("hydrogen_burner");

                }
                buildings["hydrogen_burner"].generation["energy"] += 5;
                buildings["hydrogen_burner"].generation["water"] += 3;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("hydrogen_burner");
                }
            },
            "cost": {
                "gold": 500,
                "iron": 1000,
                "glass": 100,
                "research": 3,
            },
            "tooltip": "Hydrogen Engines run at 100% efficiency.",
            "name": "Fuel Cells<br />",
            "image": "",
            "repeats": false,
        },
        "gold_crusher": {
            "unlock": function () { return buildings["gold_finder"].amount >= 5 && buildings["s_manastone"].amount >= 10; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["gold_finder"].on;
                if (comp_state) {
                    toggle_building_state("gold_finder");

                }
                buildings["gold_finder"].generation["sand"] = 2;
                buildings["gold_finder"].generation["gold"] *= 2;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("gold_finder");
                }
            },
            "cost": {
                "money": 25000,
                "iron": 2000,
                "stone": 20000,
            },
            "tooltip": "Crushes stone into sand, improving gold find rate.",
            "name": "Destructive Sifter",
            "image": "sand.png",
            "repeats": false,
        },
        "glass_furnace": {
            "unlock": function () { return buildings["furnace"].amount >= 2 && resources["sand"].amount >= 10 && purchased_upgrades.indexOf("better_furnace") != -1; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["furnace"].on;
                if (comp_state) {
                    toggle_building_state("furnace");

                }
                buildings["furnace"].generation["sand"] = -5;
                buildings["furnace"].generation["glass"] = 1;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("furnace");
                }
            },
            "cost": {
                "money": 250000,
                "iron": 20000,
                "wood": 50000,
            },
            "tooltip": "Furnaces now smelt sand into glass.",
            "name": "Glass Furnace",
            "image": "sand.png",
            "repeats": false,
        },
        "skyscraper": {                                                   /* We probably don't need this, but just in case... */
            "unlock": function () { return resources["steel_beam"].amount > 5 && buildings["skyscraper"].amount < 1; },
            "purchase": function () {
                /* Give them the first skyscraper. */
                /* So to do this we give them enough resources to buy and then just buy it */
                /* That keeps all the nasty issues of updating everything away */
                Object.keys(buildings["skyscraper"].base_cost).forEach(function (res) {
                    resources[res].amount += buildings["skyscraper"].base_cost[res];
                });
                purchase_building("skyscraper", 1);
            },
            "cost": {
                "money": 25000,
                "steel_beam": 50,
                "glass": 250,
            },
            "tooltip": "Build the first floor of a skyscraper for some managers to live in.",
            "name": "Skyscrapers",
            "image": "",
            "repeats": false,
        },
        "glassblowing": {
            "unlock": function () { return resources["glass"].amount > 5; },
            "purchase": function () {
                /* Give them the first building. */
                /* So to do this we give them enough resources to buy and then just buy it */
                /* That keeps all the nasty issues of updating everything away */
                Object.keys(buildings["glass_jeweler"].base_cost).forEach(function (res) {
                    resources[res].amount += buildings["glass_jeweler"].base_cost[res];
                });
                purchase_building("glass_jeweler", 1);
            },
            "cost": {
                "money": 25000,
                "glass": 250,
                "research": 7,
            },
            "tooltip": "Research how to blow glass into jewelry.",
            "name": "Glassblowing",
            "image": "",
            "repeats": false,
        },
        "better_jeweler": {
            "unlock": function () { return resources["sand"].amount > 0 && resources["paper"].amount > 0; },
            "purchase": function () {
                let comp_state = buildings["jeweler"].on;
                if (comp_state) {
                    toggle_building_state("jeweler");
                }

                buildings["jeweler"]["generation"]["diamond"] *= .8;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("jeweler");
                }
            },
            "cost": {
                "money": 250000,
                "sand": 2500,
                "paper": 5000,
                "research": 12,
            },
            "tooltip": "Sand diamonds for a bright polish!",
            "name": "Sandpaper<br />",
            "image": "sand.png",
            "repeats": false,
        },
        "better_jewelry_store": {
            "unlock": function () { return resources["jewelry"].amount > 100 && resources["manager"].amount > 0; },
            "purchase": function () {
                let comp_state = buildings["jewelry_store"].on;
                if (comp_state) {
                    toggle_building_state("jewelry_store");
                }

                buildings["jewelry_store"]["generation"]["money"] *= 2;
                buildings["jewelry_store"]["generation"]["manager"] = -1;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("jewelry_store");
                }
            },
            "cost": {
                "money": 10000000,
                "research": 8,
            },
            "tooltip": "High-pressure sales tactics let you sell jewelry for more. But you'll need managers to keep employees in line.",
            "name": "Sleazy Managers",
            "image": "",
            "repeats": false,
        },
        "better_trades": {
            "unlock": function () { return resources["refined_mana"].amount >= 1000 && buildings["s_trade"].on; },
            "purchase": function () {},
            "cost": {
                "refined_mana": 10000,
                "gold": 500,
            },
            "tooltip": "Your portals cover more of the market, letting you get better deals.",
            "name": "Mystic Portals",
            "image": "money.png",
            "repeats": false,
        },
        "better_trades_2": {
            "unlock": function () { return purchased_upgrades.indexOf("better_trades") != -1; },
            "purchase": function () {},
            "cost": {
                "refined_mana": 30000,
                "diamond": 1000,
            },
            "tooltip": "Your portals cover more of the market, letting you get better deals.",
            "name": "Arcane Portals",
            "image": "diamond.png",
            "repeats": false,
        },
        "better_time": {
            "unlock": function () { return buildings["s_time_magic"].on; },
            "purchase": function () { /* When bought, turn all off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["s_time_magic"].on;
                if (comp_state) {
                    toggle_building_state("s_time_magic");
                }
                buildings["s_time_magic"]["amount"] -= 10;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("s_time_magic");
                }
                $("#building_s_time_magic > .building_amount").text("30");
            },
            "cost": {
                "time": 30000,
            },
            "tooltip": "Throw away some extra time. You didn't need that, did you?",
            "name": "Time Removal",
            "image": "shield_power.png",
            "repeats": false
        },
        "uranium_finance": {
            "unlock": function () { return typeof event_flags["bribed_politician"] != "undefined" && event_flags["bribed_politician"] == "money" && buildings["s_manastone"].amount >= 200; },
            "purchase": function () { },
            "cost": {
                "money": 10000000,
                "research": 15,
            },
            "tooltip": "Get some of what you invest in. Sometimes.",
            "name": "Investment Embezzling",
            "image": "uranium.png",
            "repeats": false,
        },
        "uranium_environment": {
            "unlock": function () { return typeof event_flags["bribed_politician"] != "undefined" && event_flags["bribed_politician"] == "environment" && buildings["s_manastone"].amount >= 200; },
            "purchase": function () {
                let comp_state = buildings["big_mine"].on;
                if (comp_state) {
                    toggle_building_state("big_mine");
                }

                buildings["big_mine"]["generation"]["uranium"] = .01;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("big_mine");
                }
            },
            "cost": {
                "money": 50000000,
                "research": 15,
            },
            "tooltip": "Huh, what's this metal your strip mines are finding?",
            "name": "Deeper Mines",
            "image": "uranium.png",
            "repeats": false,
        },
        "uranium_power": {
            "unlock": function () { return resources["uranium"].amount > 10; },
            "purchase": function () {
                Object.keys(buildings["reactor"].base_cost).forEach(function (res) {
                    resources[res].amount += buildings["reactor"].base_cost[res];
                });

                purchase_building("reactor", 1);
            },
            "cost": {
                "money": 50000000,
                "research": 20,
            },
            "tooltip": "Research how to use uranium for energy.",
            "name": "Uranium Research",
            "image": "uranium.png",
            "repeats": false,
        },
        "more_events": {
            "unlock": function () { return resources["uranium"].amount > 10; },
            "purchase": function () { },
            "cost": {
                "time": 20000,
                "refined_mana": 10000,
            },
            "tooltip": "Events are more common.",
            "name": "Unlimited Events",
            "image": "shield_on.png",
            "repeats": false,
        },
        "better_library": {
            "unlock": function () { return adventure_data["cath_discovery"] >= 3; }, /* Only unlock when they adventure enough. */
            "purchase": function () {
                buildings["library"].price_ratio["iron"] = (buildings["library"].price_ratio["iron"] - 1) * .75 + 1;
                buildings["library"].price_ratio["book"] = (buildings["library"].price_ratio["book"] - 1) * .75 + 1;

                buildings["book_printer"].flavor = "New and improved: now prints 50 Shades of Grey.";
            },
            "cost": {
                "book": 5000,
            },
            "tooltip": "Print more material for your libraries.",
            "name": "Reading Material",
            "image": "",
            "repeats": false,
        },
        "better_library_2": {
            "unlock": function () { return purchased_upgrades.indexOf("better_library") != -1; }, /* Takes previous one to be allowed.  */
            "purchase": function () {
                buildings["library"].price_ratio["iron"] = (buildings["library"].price_ratio["iron"] - 1) * .67 + 1;
                buildings["library"].price_ratio["book"] = (buildings["library"].price_ratio["book"] - 1) * .67 + 1;

                buildings["book_printer"].flavor = "New and even more improved: now prints Harry Potter. All of them.";
            },
            "cost": {
                "book": 15000,
            },
            "tooltip": "Start printing actually good books for your libraries.",
            "name": "Good Reading Material",
            "image": "",
            "repeats": false,
        },
        "better_library_3": {
            "unlock": function () { return purchased_upgrades.indexOf("better_library_2") != -1; }, /* Takes previous one to be allowed.  */
            "purchase": function () {
                buildings["library"].price_ratio["iron"] = 1.05;
                buildings["library"].price_ratio["wood"] = 1.05;
                buildings["library"].price_ratio["book"] = 1.05;
                buildings["library"].price_ratio["money"] = 1.05;
            },
            "cost": {
                "wood": 150000,
            },
            "tooltip": "Libraries take more wood and less iron.",
            "name": "Elven Library",
            "image": "",
            "repeats": false,
        },
        "sandcastles": {
            "unlock": function () {
                /* Since we check if it's unlocked first, we can set the cost in this function.*/
                if (adventure_data["sandcastle_boost_unlocked"]) {
                    remaining_upgrades["sandcastles"].cost = { "sand": 1000000 * adventure_data["sandcastle_boost_unlocked"] };
                    return true;
                } else {
                    return false;
                }
            }, /* Takes previous one to be allowed.  */
            "purchase": function () {
                /* Next one costs more, remove this one from purchased ones. */
                adventure_data["sandcastle_boost_unlocked"]++;
                resources["sandcastle"].amount++;
            },
            "cost": {
                "sand": 1000000,
            },
            "tooltip": "Build a Sandcastle.",
            "name": "Sandcastle",
            "image": "",
            "repeats": true,
        },
        "glass_bottles": {
            "unlock": function () { return buildings["glass_jeweler"].amount > 0 && adventure_data["science_level"] > 0; },
            "purchase": function () {
                let comp_state = buildings["glass_jeweler"].on;
                if (comp_state) {
                    toggle_building_state("glass_jeweler");
                }

                buildings["glass_jeweler"]["generation"]["jewelry"] = 0;
                buildings["glass_jeweler"]["generation"]["glass_bottle"] = 0.01;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("glass_jeweler");
                }
            },
            "cost": {
                "money": 250000,
                "glass": 5000,
                "research": 30,
            },
            "tooltip": "Glassblowers make glass bottles instead of jewelry.",
            "name": "Bottle Making",
            "image": "",
            "repeats": false,
        },
        "money_crisis_slow_1": {
            "unlock": function () {
                if (event_flags["crisis_slow_1_increase"] == undefined) {
                    event_flags["crisis_slow_1_increase"] = 0;
                }
                /* Doubles cost each time purchased. */
                remaining_upgrades["money_crisis_slow_1"].cost["money"] = Math.pow(4, event_flags["crisis_slow_1_increase"]);
                return buildings["bank"].generation["money"] <= 5 && event_flags["bribed_politician"] == "money";
            },
            "purchase": function () {
                let comp_state = buildings["bank"].on;
                if (comp_state) {
                    toggle_building_state("bank");
                }

                buildings["bank"]["generation"]["money"] *= 10;
                event_flags["crisis_slow_1_increase"]++;
                remaining_upgrades["money_crisis_slow_1"].name = ["Raise Taxes", "Lower Taxes"][Math.random() > 0.5 ? 1 : 0];

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("bank");
                }
            },
            "cost": {
                "money": 1,
            },
            "tooltip": "Banks produce 10x money.",
            "name": "Lower Taxes",
            "image": "money.png",
            "repeats": true,
        },
        "money_crisis_slow_2": {
            "unlock": function () {
                return buildings["bank"].base_cost["money"] <= 0.5 && !event_flags["crisis_averted"];
            },
            "purchase": function () {
                event_flags["to_money_decrease"] += 120;
            },
            "cost": {
                "oil": 10000,
            },
            "tooltip": "Gives an extra 2 minutes before bank generation falls again.",
            "name": "Oil-backed Currency",
            "image": "money.png",
            "repeats": true,
        },
        "money_crisis_avert": {
            "unlock": function () {
                return buildings["bank"].base_cost["money"] == 0;
            },
            "purchase": function () {
                event_flags["crisis_averted"] = true;

                /* Fix banks. */
                let comp_state = buildings["bank"].on;
                if (comp_state) {
                    toggle_building_state("bank");
                }
                buildings["bank"].generation["money"] = 50;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("bank");
                }

                /* Fix investments */
                comp_state = buildings["big_bank"].on;
                if (comp_state) {
                    toggle_building_state("big_bank");
                }
                buildings["big_bank"].generation["money"] = 500;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("big_bank");
                }
            },
            "cost": {
                "money": 1000000000,
            },
            "tooltip": "Rebuilds your economy. Solves economy collapse until you prestige.",
            "name": "MAKE MORE JOBS!",
            "image": "money.png",
            "repeats": false,
        },
        "time_use_boost": {
            "unlock": function () {
                return resources["time"].amount > 100000 && buildings["bank"].free != undefined;
            },
            "purchase": function () { }, /* Do nothing directly, effects are implemented elsewhere. */
            "cost": {
                "time": 1,
                "mana": 100,
            },
            "tooltip": "You can use time faster.<br />Also makes more stuff affected by speed time.",
            "name": "Chronomancy",
            "image": "",
            "repeats": false,
        },
        "enviro_crisis_avert": {
            "unlock": function () {
                return resources["sludge"].amount > 10000;
            },
            "purchase": function () {
                event_flags["crisis_averted"] = true;
                event_flags["sludge_level"] = -1;
                /* Fix oil wells. */
                let comp_state = buildings["oil_well"].on;
                if (comp_state) {
                    toggle_building_state("oil_well");
                }

                buildings["oil_well"].amount = 15;
                purchase_building("oil_well", 0); /* Actually updates amount show. */
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("oil_well");
                }
                buildings["oil_well"].base_cost = {};


                /* Fix oil engines. */
                comp_state = buildings["oil_engine"].on;
                if (comp_state) {
                    toggle_building_state("oil_engine");
                }

                buildings["oil_engine"].amount = 10;
                purchase_building("oil_engine", 0); /* Actually updates amount show. */
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("oil_engine");
                }
                buildings["oil_engine"].base_cost = {};


                /* Fix ink refinery. */
                comp_state = buildings["ink_refinery"].on;
                if (comp_state) {
                    toggle_building_state("ink_refinery");
                }

                buildings["ink_refinery"].amount = 5;
                purchase_building("ink_refinery", 0); /* Actually updates amount show. */
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("ink_refinery");
                }
                buildings["ink_refinery"].base_cost = {};


                /* And finally, the bonuses... */
                buildings["solar_panel"].price_ratio = {
                    "money": 0.99,
                    "glass": 1.04,
                    "coal": 1.05,
                    "diamond": 1.05,
                };
                buildings["solar_panel"].free = 15;
                buildings["solar_panel"].multipliers = {"diamond": .05, "glass": .05};
                buildings["solar_panel"].generation["fuel"] = 0.0002;
            },
            "cost": {
                "money": 100000000, /* IDK let's just throw some costs up and say it's good. */
                "water": 1000000,
                "wood" : 10000000,
            },
            "tooltip": "Clean up the environment. You won't be able to use oil near the amount you were though.",
            "name": "Cleanup",
            "image": "",
            "repeats": false,
        },
        "better_logic": {
            "unlock": function () {
                if (adventure_data["logicat_level"] >= 20) {
                    this.cost = {};
                    return true;
                }
                return adventure_data["logicat_rush"] != undefined;
            },
            "purchase": function () { },
            "cost": {
                "fuel": 100,
            },
            "tooltip": "Logicats give 1 free answer.",
            "name": "Panther Rush",
            "image": "",
            "repeats": false,
        },
        "cheaper_skyscraper": {
            "unlock": function () { return buildings["steel_smelter"].amount >= 1; },
            "purchase": function () {
                buildings["skyscraper"].price_ratio = {
                    "money": 1.05,
                    "steel_beam": 1.05,
                    "glass": 1.05,
                };
            },
            "cost": {
                "iron": 100000,
                "steel_beam": 5000,
                "diamond": 10000,
            },
            "tooltip": "Skyscrapers are cheaper to buy.",
            "name": "Stronger Alloys<br />",
            "image": "",
            "repeats": false,
        },
        "fake_all_1": {
            "unlock": function () { return buildings["s_manastone"].amount < 500 && adventure_data["logicat_chairs"]; },
            "purchase": function () {
                alert("Uhh... how did you buy this?");
            },
            "cost": {
                "mana": 500,
            },
            "tooltip": "Multiplies ALL rates by 0 and then adds 1.",
            "name": "Chairs sit on people<br />",
            "image": "",
            "repeats": false,
        },
        "all_1": {
            "unlock": function () { return buildings["s_manastone"].amount >= 500 && adventure_data["logicat_chairs"]; },
            "purchase": function () {
                Object.keys(resources).forEach(function (res) {
                    setInterval(function () {
                        if (resources[res].value > 0 && resources[res].amount > 0 && resources_per_sec[res] != 0) {
                            resources[res].mult = 1;
                            resources_per_sec[res] = 1;
                        }
                    }, 50);
                });
            },
            "onload": function () {
                this.purchase();
            },
            "cost": {
                "refined_mana": 100000,
            },
            "tooltip": "Multiplies ALL rates by 0 and then adds 1.",
            "name": "Chairs sit on people<br />",
            "image": "",
            "repeats": false,
        },
        "fix_1": {
            "unlock": function () { return purchased_upgrades.indexOf("all_1") != -1; },
            "purchase": function () {
                purchased_upgrades.splice(purchased_upgrades.indexOf("all_1"), 1);
                save();
                location.reload();
            },
            "cost": {
            },
            "tooltip": "Undo Chairs sit on People.",
            "name": "Broken Chair<br />",
            "image": "",
            "repeats": true,
        },
        "make_purifier": {
            "unlock": function () { return adventure_data["mana_purifier"] == undefined && event_flags["know_pts"] >= 10; },
            "purchase": function () {
                adventure_data["mana_purifier"] = 1;
                let build_state = buildings["mana_purifier"].on;
                if (build_state) {
                    toggle_building_state("mana_purifier");
                }
                buildings["mana_purifier"].amount = 1;
                if (build_state) { /* Only turn on if it already was on */
                    toggle_building_state("mana_purifier");
                }
                $("#building_mana_purifier  > .building_amount").html(format_num(buildings["mana_purifier"].amount, false));

            },
            "cost": {
                "refined_mana": 500000,
            },
            "tooltip": "Constructs a mana purifier. Can only be purchased once.",
            "name": "Mana Mastery<br />",
            "image": "",
            "repeats": false,
        },
        "garden": {
            "unlock": function () { return event_flags["garden"] != undefined; },
            "current_seed": -1,
            "purchase": function (clicked = true) {
                if (clicked) { this.current_seed = -1; }

                $("#events_topbar").html("Gardening");
                $("#events_content").html("<span id='current_seed'></span>");
                if (this.current_seed != -1) {
                    if (this.current_seed > 0) {
                        $("#current_seed").html("Currently planting: " + event_flags["seeds"][this.current_seed].name);
                    } else if (this.current_seed == -2) {
                        $("#current_seed").html("Currently watering");
                    } else if (this.current_seed == -3) {
                        $("#current_seed").html("Currently fertilizing");
                    } else if (this.current_seed == -4) {
                        $("#current_seed").html("Clearing plants");
                    }
                }
                $("#events_content").append(
                    "<table class='fgc' style='border: none; background-color: darkgreen; border-collapse: collapse;'>" + 
                    "<tr style='height: 10em;'>             " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td class='bgc_second' style='border: none;'></td>      " +
                    "</tr>                                  " +
                    "<tr style='height: 10em;'>             " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td class='bgc_second' style='width: 10em; border: 1px solid;'></td>      " +
                    "</tr>                                  " +
                    "<tr style='height: 10em;'>             " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td style='width: 10em; border: 1px solid;'></td>      " +
                    "    <td class='bgc_second' style='border: none'></td>      " +
                    "</tr></table>");

                /* Set up bar to the right. */
                $("#events_content table tr:eq(1) td:eq(3)").html("<span class='clickable'>Water</span><br />");
                $("#events_content table tr:eq(1) td:eq(3) span").last().click(() => {
                    console.log("Started watering");
                    this.current_seed = -2;
                    $("#current_seed").html("Currently watering");
                });
                $("#events_content table tr:eq(1) td:eq(3)").append("<span class='clickable'>Fertilize</span><br />");
                $("#events_content table tr:eq(1) td:eq(3) span").last().click(() => {
                    console.log("Started feeding");
                    this.current_seed = -3;
                    $("#current_seed").html("Currently fertilizing");
                });
                $("#events_content table tr:eq(1) td:eq(3)").append("<span class='clickable'>Remove</span>");
                $("#events_content table tr:eq(1) td:eq(3) span").last().click(() => {
                    console.log("Started removing");
                    this.current_seed = -4;
                    $("#current_seed").html("Clearing plants");
                });

                /* Set up all cell contents. */
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        let plot = $("#events_content table tr:eq(" + j.toString() + ") td:eq(" + i.toString() + ")");
                        let plot_data = event_flags["garden"][i][j]
                        if (event_flags["garden"][i][j] == null) {
                            plot.html("Nothing<br /> Planted");
                            plot.click(() => {
                                if (this.current_seed >= 0) {
                                    event_flags["garden"][i][j] = event_flags["seeds"].splice(this.current_seed, 1)[0];
                                    event_flags["garden"][i][j]["water"] = 100; /* Set initial nutrient levels. */
                                    event_flags["garden"][i][j]["food"] = 10;
                                    event_flags["garden"][i][j]["time_left"] = event_flags["garden"][i][j]["grow_time"];
                                    event_flags["garden"][i][j]["last_update"] = Date.now();
                                    this.current_seed = -1;
                                    this.purchase(false);
                                }
                            });
                        } else {
                            /* First, we need to update it. */
                            let time = (Date.now() - plot_data.last_update) / 1000;
                            time = Math.min(time, plot_data.time_left, plot_data.water, plot_data.food); /* Only run as far as possible. */
                            plot_data.time_left -= time; 
                            plot_data.water -= time;
                            plot_data.food -= time;
                            plot_data.last_update = Date.now();

                            plot.html(event_flags["garden"][i][j].name + "<br />");
                            if (plot_data.time_left > 0) {
                                /* Time */
                                let time_length = 8 * plot_data.time_left / plot_data.grow_time;
                                plot.append("<div class='clickable' style='width: " + time_length.toString() + "em; height: .5em; background-color: green;'></div><br />");
                                /* Water */
                                let water_length = 8 * event_flags["garden"][i][j].water / 100;
                                if (water_length > 0) {
                                    plot.append("<div class='clickable' style='width: " + water_length.toString() + "em; height: .5em; background-color: blue;'></div><br />");
                                } else {
                                    plot.append("<div class='clickable' style='background-color: blue;'>WATER</div><br />");
                                }

                                /* Food */
                                let food_length = 8 * event_flags["garden"][i][j].food / 100;
                                if (food_length > 0) {
                                    plot.append("<div class='clickable' style='width: " + food_length.toString() + "em; height: .5em; background-color: brown;'></div><br />");
                                } else {
                                    plot.append("<div class='clickable' style='background-color: brown;'>FEED</div><br />");
                                }

                                plot.click(() => {
                                    if (this.current_seed == -2) {
                                        plot_data.water += 10;
                                        if (plot_data.water > 100) {
                                            plot_data.water = 100;
                                        }
                                        console.log("Plant watered.");
                                    } else if (this.current_seed == -3) {
                                        plot_data.food += 10;
                                        if (plot_data.water > 100) {
                                            plot_data.water = 100;
                                        }
                                        console.log("Plant fed");
                                    } else if (this.current_seed == -4) {
                                        event_flags["garden"][i][j] = null;
                                    }
                                    this.purchase(false);
                                });
                            } else { /* Fully grown, ready to pick I guess. */
                                plot.append("Ready for harvest");
                                plot.click(() => {
                                    let message = SEED_FUNCS[plot_data.harvest](plot_data);
                                    alert(message);
                                    event_flags["garden"][i][j] = null;

                                    this.purchase(false);
                                    
                                });
                            }


                        }
                    }
                }
                for (let i = 0; i < event_flags["seeds"].length; i++) {
                    let index = i;
                    let seed = event_flags["seeds"][i];
                    $("#events_content").append("<span class='clickable'>Plant</span> " + seed.name + "<br />");
                    $("#events_content span").last().click(() => {
                        $("#current_seed").html("Currently planting: " + seed.name);
                        this.current_seed = index;
                    });
                }

                $("#events").removeClass("hidden");

                /* Keep refreshing for plant updates. */
                setTimeout(() => {
                    if ($("#events_topbar").text() == "Gardening" && !$("#events").hasClass("hidden")) {
                        this.purchase(false);
                    }
                }, 1000);
            },
            "cost": {
                "fuel": 25,
            },
            "tooltip": "Take a trip to your greenhouse.",
            "name": "Greenhouse<br />",
            "image": "",
            "repeats": true,
        },


        "trade": { /* Having it unlockable here lets the actual element get in the list. */
            "unlock": function () { return false; },
            "purchase": function () { },
            "cost": {},
            "tooltip": "",
            "name": "Trade Items<br />",
            "image": "money.png",
            "repeats": true,
        },

    };
    event_flags = {};
    $("#buy_amount").val(1);
}

let prestige = {
    points: function (DEBUG = false) {
        let prestige_points = 0;
        let prestige_vals = [];
        let prestige_names = [];
        Object.keys(resources).forEach((res) => {
            if (isNaN(resources[res].amount)) {
                resources[res].amount = 0;
            }
            if (res == "sandcastle") {
                prestige_points += 5000000 * Math.pow(resources[res].amount, .9);
            } else {
                prestige_points += resources[res].amount * Math.abs(resources[res].value);
                if (resources[res].amount > 0 && resources[res].value > 0) {
                    prestige_vals.push(resources[res].amount * resources[res].value);
                    prestige_names.push(res);
                }
            }
        });

        /* Maybe add a funky multiplier */
        if (DEBUG) {
            function standardDeviation(values) {
                var avg = average(values);

                var squareDiffs = values.map(function (value) {
                    var diff = value - avg;
                    var sqrDiff = diff * diff;
                    return sqrDiff;
                });

                var avgSquareDiff = average(squareDiffs);

                var stdDev = Math.sqrt(avgSquareDiff);
                return stdDev;
            }

            function average(data) {
                var sum = data.reduce(function (sum, value) {
                    return sum + value;
                }, 0);

                var avg = sum / data.length;
                return avg;
            }
            let st_dev = standardDeviation(prestige_vals);
            let sq_diff_vals = prestige_vals.map(function (value) {
                var diff = value - average(prestige_vals);
                var sqrDiff = diff * diff;
                return Math.sqrt(sqrDiff);
            });
            let largest_off = Math.max(...sq_diff_vals);
            
            console.log("Prestige info: ");
            console.log("Values: ", prestige_vals);
            console.log("Standard Deviation: ", st_dev);
            console.log("Worst resource:", prestige_names[sq_diff_vals.indexOf(largest_off)], largest_off);
            
        }

        return prestige_points;
    },
    /* Calculate mana gain */
    mana: function (round = true) {
        let prestige_points = prestige.points();

        let mana_this_prestige = event_flags["mage_quickmana"]; /* How much instant mana has given them. */
        if (mana_this_prestige == undefined) {
            mana_this_prestige = 0;
        }

        let mana = buildings["s_manastone"].amount - mana_this_prestige; /* Don't count mana gained this prestige in here. */
        let mana_gain = prestige_points / 15000 - Math.pow(mana, 1.3) * .5; /* One for every 20k pp, and apply reduction based off of current mana */
        mana_gain = Math.pow(Math.max(0, mana_gain), .36); /* Then raise to .33 power and apply some rounding/checking */
        mana_gain = mana_gain / (1 + Math.floor(mana / 50) * .5); /* Then divide gain by a number increasing every 50 mana. */
        if (mana_gain > 50) { /* If they're getting a ton, they get less*/
            mana_gain = 50 + (mana_gain - 50) / 2;
        }
        mana_gain -= mana_this_prestige; /* Take out what they already got. */
        if (event_flags["skills"] != undefined && event_flags["skills"][8]) { /* They have the quick mana skill */
            if (event_flags["mage_quickmana"] == undefined) { /* Quickly define this. */
                event_flags["mage_quickmana"] = 0; 
            }

            if (mana_gain > 1) { /* Give some mana. */
                let gained = Math.floor(mana_gain)
                event_flags["mage_quickmana"] += gained
                buildings["s_manastone"].amount += gained;
                purchase_building("s_manastone", 0);
                resources_per_sec["mana"] += buildings["s_manastone"].generation["mana"] * gained;
                mana_gain -= gained
            }
        }

        if (round) {
            return Math.floor(mana_gain);
        } else {
            return mana_gain;
        }
    },
    percent_through: function () {
        if (prestige.mana() < 1 && event_flags["mage_quickmana"] == undefined) {
            return Math.max(0, Math.min(100, Math.floor((prestige.points() / 15000) / (Math.pow(buildings["s_manastone"].amount, 1.3) * .5 + 1) * 100)));
        } else {
            return Math.round(100 * (prestige.mana(false) - prestige.mana(true) ));
        }
    },
    run: function (ask = true) {
        let mana_gain = prestige.mana();
        let mana = buildings["s_manastone"].amount;
        if (mana_gain < 1 && ask) {
            if (!confirm("Prestige now wouldn't produce mana! As you get more mana, it gets harder to make your first mana stone in a run. You are currently " + prestige.percent_through().toString() + "% of the way to your first mana. Prestige anyway?")) {
                return;
            }
        }
        if (!ask || confirm("You will lose all resources and all buildings but gain " + mana_gain.toString() + " mana after reset. Proceed?")) {
            let total_mana = buildings["s_manastone"].amount + mana_gain;
            set_initial_state();
            buildings["s_manastone"].amount = total_mana;
            adventure_data.current_location = "home"; /* You have to prestige at home. */
            /* Open bags of holding. Iterate backwards so we don't skip bags.  */
            for (let i = adventure_data.inventory.length - 1; i >= 0; i--) {
                if (adventure_data.inventory[i].name == "bag" && adventure_data.inventory[i].resource != undefined) {
                    resources[adventure_data.inventory[i].resource].amount += adventure_data.inventory[i].amount;
                    adventure_data.inventory.splice(i, 1);
                }
            }
            for (let i = adventure_data.warehouse.length - 1; i >= 0; i--) {
                if (adventure_data.warehouse[i].name == "bag" && adventure_data.warehouse[i].resource != undefined) {
                    resources[adventure_data.warehouse[i].resource].amount += adventure_data.warehouse[i].amount;
                    adventure_data.warehouse.splice(i, 1);
                }
            }
            save();
            location.reload();
        }

    },
    update: function () {
        if (prestige.mana()) {
            $("#prestige > span").first().html("Prestige&nbsp;(" + format_num(prestige.mana(), false) + ", " + format_num(prestige.percent_through(), false) + "%)")
        } else {
            $("#prestige > span").first().html("Prestige&nbsp;(" + format_num(prestige.percent_through(), false) + "%)")
        }

        let suggested_amounts = [2, 5, 10, 27, 52, 92, 150, 200]; /* What mana amounts are good to prestige at. */

        for (let i in suggested_amounts) {
            if (suggested_amounts[i] > buildings["s_manastone"].amount) {
                $("#prestige_suggest").html("Your next prestige goal is at " + format_num(suggested_amounts[i] - buildings["s_manastone"].amount, false) + " more mana.");
                break;
            }
        }
    }
}



function add_log_elem(to_add: string) {
    while ($("#log > span").length >= 10) { /* We want to remove the last element(s) to bring length to 9.*/
        $("#log > span").last().remove(); /* Remove last child. Repeat until no more. */
    }
    $("#log").prepend("<span>" + to_add + "<br />" + "</span>");
}

function save() {
    Object.keys(resources).forEach(function (type) {
        localStorage["res-" + type] = resources[type].amount;
    });
    Object.keys(buildings).forEach(function (type) {
        localStorage["build-" + type] = JSON.stringify(buildings[type]);
    });
    localStorage["flags"]     = JSON.stringify(event_flags);
    localStorage["upgrades"]  = JSON.stringify(purchased_upgrades);
    localStorage["last_save"] = Date.now();
    localStorage["adventure"] = JSON.stringify(adventure_data);
    localStorage["groupings"] = JSON.stringify(groupings);
    localStorage["rules"] = JSON.stringify(rules);
    localStorage["erules"] = JSON.stringify(erules);

    $('#save_text').css('opacity', '1'); setTimeout(() => $('#save_text').css({ 'opacity': '0', 'transition': 'opacity 1s' }), 1000);
    console.log("Saved");
    add_log_elem("Saved!");
}

function load() {
    console.log("Loading resources...");
    Object.keys(resources).forEach(function (type) {
        if (localStorage.getItem("res-" + type)) {
            resources[type].amount = parseFloat(localStorage.getItem("res-" + type));
        }
    });
    console.log("Loading buildings...");
    Object.keys(buildings).forEach(function (type) {
        if (localStorage.getItem("build-" + type)) {
            buildings[type] = JSON.parse(localStorage.getItem("build-" + type));
            if (buildings[type].amount == null) {
                buildings[type].amount = Infinity;
            }
            /* Show how many buildings they have and set tooltip properly */
            $('#building_' + type + " > .building_amount").html(format_num(buildings[type].amount, false));
        } 
    });
    console.log("Loading flags...");
    if (localStorage.getItem("flags")) {
        event_flags = JSON.parse(localStorage.getItem("flags"));
    } 
    console.log("Setting workshop mode...");
    if (buildings["s_manastone"].amount > 0) {
        $("#spells").removeClass("hidden");
        s_workshop(buildings["s_workshop"].mode); /* Load workshop option */
    }
    console.log("Loading upgrades...");
    if (!localStorage.getItem("upgrades")) {
        purchased_upgrades = [];
    } else {
        purchased_upgrades = JSON.parse(localStorage.getItem("upgrades"));
    }
    console.log("Loading last update");
    if (localStorage.getItem("last_save")) {
        last_update = parseInt(localStorage.getItem("last_save"));
    }
    console.log("Loading adventure mode");
    if (localStorage.getItem("adventure")) {
        adventure_data = JSON.parse(localStorage.getItem("adventure"));
    }
    console.log("Loading groupings");
    if (localStorage.getItem("groupings")) {
        groupings = JSON.parse(localStorage.getItem("groupings"));
        if (adventure_data["groupings_unlocked"]) {
            $("#production_box").parent().removeClass("hidden");
            $("#all_on").addClass("hidden");
            $("#all_off").addClass("hidden");
        }
    }
    console.log("Loading rules");
    if (localStorage.getItem("rules")) {
        rules = JSON.parse(localStorage.getItem("rules"));
        if (adventure_data["rules_unlocked"]) {
            $("#pc_box").parent().removeClass("hidden");
        }
    }
    console.log("Loading erules");
    if (localStorage.getItem("erules")) {
        erules = JSON.parse(localStorage.getItem("erules"));
    }
    console.log("Loading theme");
    if (!localStorage.getItem("theme")) {
        localStorage["theme"] = "dark"; /* Default dark theme. */
    }
    change_theme(localStorage.getItem("theme"));

    purchased_upgrades.forEach(function (upg) {
        let upg_name = remaining_upgrades[upg].name;
        if (remaining_upgrades[upg]["onload"] != undefined) {
            remaining_upgrades[upg]["onload"]();
        }
        delete remaining_upgrades[upg]; /* They shouldn't be able to get the same upgrade twice, so delete what was bought. */
        update_total_upgrades(upg_name);
    });

    /* Recalculate earnings. Loop through each building */
    Object.keys(buildings).forEach(function (name) {
        /* See if it's on */
        if (buildings[name].on) {
            /* Go through each resource it generates... */
            Object.keys(buildings[name].generation).forEach(function (key) {
                /* And increase production */
                resources_per_sec[key] += buildings[name].amount * buildings[name].generation[key];
                resources[key].changes[$("#building_" + name + " > .building_name").text()] = buildings[name].amount * buildings[name].generation[key];
                resource_tooltip();
            });
            /* And add the multiplier */
            Object.keys(buildings[name].multipliers).forEach(function (key) {
                resources[key].mult *= 1 + buildings[name].amount * (buildings[name].multipliers[key]);
            });
            $("#toggle_" + name).addClass("building_state_on");
            $("#toggle_" + name).removeClass("building_state_off");
            $("#toggle_" + name).text("On");
        } else {
            $("#toggle_" + name).addClass("building_state_off");
            $("#toggle_" + name).removeClass("building_state_on");
            $("#toggle_" + name).text("Off");
        }
    });
}

function save_to_clip() { /* Put save data in clipboard. Copied from Stack Overflow :) */
    function b64EncodeUnicode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16))
        }))
    }

    save();
    let text = b64EncodeUnicode(JSON.stringify(localStorage));
    let textArea: any = document.createElement("textarea");

    /* Styling to make sure it doesn't do much if the element gets rendered */

    /* Place in top-left corner of screen regardless of scroll position. */
    textArea.style.position = 'fixed'; textArea.style.top = 0; textArea.style.left = 0; textArea.style.width = '2em'; textArea.style.height = '2em';

    textArea.style.padding = 0; textArea.style.border = 'none'; textArea.style.outline = 'none'; textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent'; textArea.value = text;

    document.body.appendChild(textArea);
    textArea.select();

    try {
        let successful = document.execCommand('copy');
        if (successful) {
            alert("Save copied to clipboard.");
        } else {
            console.log("Copying unsuccessful?");
        }
    } catch (err) {
        console.log('Oops, unable to copy');
    }
    document.body.removeChild(textArea);
}

function load_from_clip() {
    function b64DecodeUnicode(str) {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
    }

    let loaded_data = b64DecodeUnicode(prompt("Paste your save data here."))
    try {
        loaded_data = JSON.parse(loaded_data);

        Object.keys(loaded_data).forEach(function (key) {
            localStorage[key] = loaded_data[key];
        });
    } catch (e){
        /* Using old save probably */
        loaded_data.split(';').forEach(function (data) {
            try {
                let split_data = data.replace(' ', '').split("=");
                localStorage[split_data[0]] = split_data[1]
            } catch (e) {
                console.error(e.message)
            }
        });
    }

    location.reload();
}

function resource_tooltip() {
    Object.keys(resources).forEach(function (res) {
        if (!$.isEmptyObject(resources[res].changes)) {
            let changes = "";
            /* Iterate through all things changing, sorted by amount they provide. */
            Object.keys(resources[res].changes).sort(function (a, b) { return resources[res].changes[b] - resources[res].changes[a]}).forEach(function (changer) {
                if (resources[res].changes[changer] != 0) {
                    changes += "<tr><td>" + changer + "</td><td>" + format_num(resources[res].changes[changer], true) + "</td></tr>";
                }
            });
            resources[res].ps_change = "<table class='change_track'>" + changes + "</table>";
        }
    });
}

function toggle_building_state(name: string) {
    if (buildings[name].on) { /* Turn it off */
        if (name == "s_mana_refinery") { return; /* Can't turn off the refinery */}
        buildings[name].on = false;
        /* Go through each resource it generates... */
        Object.keys(buildings[name].generation).forEach(function (key) {
            /* And decrease production by that much */
            resources_per_sec[key] -= buildings[name].amount * buildings[name].generation[key];
            if (resources[key].value == 0) {
                resources[key].amount -= buildings[name].amount * buildings[name].generation[key];
            }
            delete resources[key].changes[$("#building_" + name + " > .building_name").text()];
            resource_tooltip();
        });
        Object.keys(buildings[name].multipliers).forEach(function (key) {
            resources[key].mult /= 1 + buildings[name].amount * (buildings[name].multipliers[key]);
        });

        $("#toggle_" + name).addClass("building_state_off");
        $("#toggle_" + name).removeClass("building_state_on");
        $("#toggle_" + name).text("Off");
    } else { /* Turn it on */
        /* Make sure we can run for 1s first */
        try {
            Object.keys(buildings[name].generation).forEach(function (key) {
                /* Make sure we can still run buildings if they generate a resource we have negative of. */
                if (resources[key].value == 0 && buildings[name].generation[key] < 0 && buildings[name].amount * buildings[name].generation[key] * -1 > resources_per_sec[key]) {
                    throw "Not enough special resources.";
                }
            });
        } catch (e) {
            /* We don't want this error going all the way through the stack as a ton of places call this function and need to continue (they rely on it silently failing) */
            return 1;
        }

        buildings[name].on = true;
        /* Go through each resource it generates... */
        Object.keys(buildings[name].generation).forEach(function (key) {
            /* And increase production */
            resources_per_sec[key] += buildings[name].amount * buildings[name].generation[key];
            /* Also for special production. */
            if (resources[key].value == 0) {
                resources[key].amount += buildings[name].amount * buildings[name].generation[key];
            }
            resources[key].changes[$("#building_" + name + " > .building_name").text()] = buildings[name].amount * buildings[name].generation[key];
            resource_tooltip();
        });
        /* Add multipliers. */
        Object.keys(buildings[name].multipliers).forEach(function (key) {
            resources[key].mult *= 1 + buildings[name].amount * (buildings[name].multipliers[key]);
        });

        $("#toggle_" + name).addClass("building_state_on");
        $("#toggle_" + name).removeClass("building_state_off");
        $("#toggle_" + name).text("On");
    }
}

var time_on = false;
function toggle_time() {
    time_on = !time_on
    $("#time_toggle").html((time_on ? "Slow" : "Speed") + " time");
}
var rule_timer = 0;
var last_update: number = Date.now();
function update() {
    /* Find time since last update. */
    let delta_time: number = Date.now() - last_update;
    last_update = Date.now();

    if (delta_time > 15000) { /* More than 15 sec between tics and it's offline gen time. */
        resources["time"].amount += delta_time / 1000; /* 1 sec of production, rest goes to time. */

        /* This is where offline events go. We say we get 1 every 30 minutes. */
        if (event_flags["skills"] && event_flags["skills"][2]) {
            /* Cap at 20 events.*/
            let num_events = Math.min(20, Math.round(delta_time / (60000 * 30)));
            /* while num_events goes to 0. */
            while (num_events --> 0) {
                $("#events").addClass("hidden"); /* Hide it for next event. */
                handle_event(false); /* Run an event. */
            }
        }
        return;
    }

    if (time_on) {
        /* Find how much time they will use up */
        if (resources["time"].amount < 10) { /* Not enough for a full addition to the tick. */
            delta_time += resources["time"].amount * 1000; /* Give extra production for however much they can get, and remove that much time. */
            toggle_time();
            resources["time"].amount = 0;
        } else { /* Add 10s of production to this tick and remove the time. */
            delta_time += 10000;
            resources["time"].amount -= 10;

            /* They bought a boost! Use time on a percent base.*/
            if (purchased_upgrades.indexOf("time_use_boost") != -1) {
                let amt = resources["time"].amount * 0.01;
                if (amt > Math.pow(buildings["s_manastone"].amount, 2) * 0.01) {
                    amt = Math.pow(buildings["s_manastone"].amount, 2) * 0.01;
                }
                delta_time += 1000 * amt;
                resources["time"].amount -= amt;
            }
        }
    }
    /* Perform rules */
    rule_timer += delta_time;
    if (rule_timer > 1000) {
        run_rules();
        rule_timer = 0;
    }

    /* Check for negative resources or resources that will run out. */
    Object.keys(resources).forEach(function (res) { /* Loop through all resources, res is current checked resource */
        if (isNaN(resources[res].amount)) { resources[res].amount = 0; }
        if (resources[res].amount > 0.1) {
            /* Unhide resources we have */
            $("#" + res).removeClass("hidden");
        } else {
            $("#" + res).addClass("hidden");
        }
        let time = delta_time;
        /* These don't normally run out. */
        if (resources[res].value == 0) {
            time = 0
        }
        /* Resource will run out. */
        if (resources[res].amount < -resources_per_sec[res] * time / 1000) {
            /* Check all buildings */
            Object.keys(buildings).forEach(function (build) { /* Loop through all buildings, build is current checked building */
                /* Check resource gen */
                if (buildings[build].generation[res] < 0 && buildings[build].on && buildings[build].amount > 0) {
                    toggle_building_state(build);
                    console.log("Turned off " + build + ": Not enough " + res);
                }
            });
        }
    });

    /* Perform spell actions */
    SPELL_BUILDINGS.forEach(function (build) {
        if (buildings[build].on) {
            spell_funcs[buildings[build].update](delta_time);
        }
    });


    /* Update all resources */
    Object.keys(resources).forEach(function (key) {
        /* Don't add special resources */
        if (resources[key].value != 0) {
            /* Only positive generation gets a multiplier. */
            if (resources_per_sec[key] > 0) {
                resources[key].amount += resources_per_sec[key] * resources[key].mult * delta_time / 1000;
            } else {
                resources[key].amount += resources_per_sec[key] * delta_time / 1000;
            }
        } else { /* We have as much of specialty resources as we generate */
            resources[key].amount = resources_per_sec[key];
        }
        /* Formats it so that it says "Resource name: amount" */
        $("#" + key + " span").first().html((key.charAt(0).toUpperCase() + key.slice(1)).replace("_", " ") + ": " + format_num(resources[key].amount, false));

        /* Same for per sec */
        $("#" + key + "_per_sec").text((resources_per_sec[key] > 0 ? "+" : "") + format_num(resources_per_sec[key]) + "/s");
        /* Display multiplier if positive RPS and mult not 1 (approx) */
        if (resources_per_sec[key] > 0 && Math.abs(resources[key].mult - 1) > 0.001) {
            let color = resources[key].mult > 1 ? "green" : "red";
            $("#" + key + "_per_sec").append(" <span style='color:" + color + "'>(x" + format_num(resources[key].mult) + ")</span>");
        }
        /* Add tooltip */
        if ($("#" + key + " .tooltiptext").length == 0) {
            $("#" + key).addClass("tooltip");
            $("#" + key).append("<span class='tooltiptext fgc bgc_second'>" + resources[key].ps_change + "</span>");
        } else {
            $("#" + key + " .tooltiptext").html(resources[key].ps_change);
        }
        /* Don't color special resources */
        if (resources[key].value <= 0) {
            return;
        }
        /* Color it. */
        if (resources[key].amount < -0.0001) {
            $("#" + key).css("color", "red");
        } else {
            $("#" + key).css("color", "");
        }

        /* Color per sec. Hide if super small. */
        if (resources_per_sec[key] < -0.0001) {
            $("#" + key + "_per_sec").css("color", "red");
        } else if (resources_per_sec[key] > 0.0001) {
            $("#" + key + "_per_sec").css("color", "");
        } else {
            $("#" + key + "_per_sec").text("");
        }
    });

    /* Unhide buildings */
    Object.keys(buildings).forEach(function (build) {
        if (SPELL_BUILDINGS.indexOf(build) == -1) {
            $('#building_' + build + " > .tooltiptext").html(gen_building_tooltip(build)); /* Generate tooltip for it. */
        }
        if (buildings[build].amount > 0 && SPELL_BUILDINGS.indexOf(build) == -1) {
            $("#building_" + build).parent().removeClass("hidden"); /* Any owned building is unlocked. Needed in case they sell previous ones and reload. */
            UNLOCK_TREE[build].forEach(function (unlock) {
                $("#building_" + unlock).parent().removeClass("hidden");
            });
        }

        try {
            let amount = parseInt($("#buy_amount").val());
            if (isNaN(amount)) { amount = 1; }
            Object.keys(buildings[build].base_cost).forEach(function (key) {
                let cost = buildings[build].base_cost[key] * Math.pow(buildings[build].price_ratio[key], buildings[build].amount - buildings[build].free) * (1 - Math.pow(buildings[build].price_ratio[key], amount)) / (1 - buildings[build].price_ratio[key]);
                if (Math.pow(buildings[build].price_ratio[key], buildings[build].amount + amount - 1 - buildings[build].free) == Infinity) {
                    cost = Infinity;
                }
                if (cost > resources[key].amount) {
                    throw Error("Not enough resources!");
                }
            });
            $("#building_" + build).removeClass("building_expensive");
        } catch (e) {
            $("#building_" + build).addClass("building_expensive");
        }
    });
    /* Show favicon */
    if ($("#events").hasClass("hidden")) {
        $("#icon").attr("href", "images/favicon.ico");
    } else {
        $("#icon").attr("href", "images/favicon2.ico");
    }
}

/* Not in update as this could change a lot if they have too many unpurchased upgrades. */
function update_upgrade_list() {
    /* Loop through all remaining upgrades */
    Object.keys(remaining_upgrades).forEach(function (upg_name) {
        if (remaining_upgrades[upg_name].unlock()) {
            $("#upgrade_" + upg_name).removeClass("hidden");
            let color = ""; /* Set color to lightgray or red depending on if they can afford it */
            Object.keys(remaining_upgrades[upg_name].cost).forEach(function (res) {
                if (resources[res].amount < remaining_upgrades[upg_name].cost[res]) {
                    color = "red";
                }
            });
            $("#upgrade_" + upg_name).css("color", color);

            /* Refresh tooltip */
            let tooltip = remaining_upgrades[upg_name].tooltip;
            let reg_costs = [];
            let req_costs = []
            Object.keys(remaining_upgrades[upg_name].cost).forEach(function (res) {
                if (resources[res].value) {
                    let cost = ""
                    if (resources[res].amount < remaining_upgrades[upg_name].cost[res]) {
                        cost += "<span style='color: red'>";
                    } else {
                        cost += "<span class='fgc'>";
                    }
                    cost += format_num(remaining_upgrades[upg_name].cost[res], true) + " " + res.replace("_", " ") + "</span>";
                    reg_costs.push(cost);
                } else {
                    let cost = ""
                    if (resources[res].amount < remaining_upgrades[upg_name].cost[res]) {
                        cost += "<span style='color: red'>";
                    } else {
                        cost += "<span class='fgc'>";
                    }
                    cost += "Requires " + format_num(remaining_upgrades[upg_name].cost[res], true) + " " + res.replace("_", " ") + "</span>";
                    req_costs.push(cost);
                }
            });
            if (reg_costs.length && upg_name != "trade") {
                tooltip += "<br />Costs " + reg_costs.join(", ");
            }
            if (req_costs.length) {
                tooltip += "<br />" + req_costs.join("<br />");
            }
            $("#upgrade_" + upg_name + " .tooltiptext").html(tooltip);
        } else {
            $("#upgrade_" + upg_name).addClass("hidden");
        }
            
    });
}

function update_total_upgrades(name: string) {
    /* Update upgrade total */
    $("#num_upgrades").html("Upgrades: " + purchased_upgrades.length.toString());
    /* Update tooltip list of purchased upgrades */
    $("#purchased_upgrades").append("<br />" + name.replace("<br />", ""));

}

function gen_building_tooltip(name: string) {
    let amount = parseInt($("#buy_amount").val());
    if (isNaN(amount)) { amount = 1; }
    let tooltip = "";
    let gen_text: string = "";
    /* Add resource gen, update how much each one generates. */
    Object.keys(buildings[name].generation).forEach(function (key) {
        if (resources[key].value) { /* Add X per second for regular resources */
            gen_text += format_num(buildings[name].generation[key]) + " " + key.replace("_", " ") + "/s, "
        } else {
            gen_text +=format_num(buildings[name].generation[key]) + " " + key.replace("_", " ") + ", "
        }
    });
    if (gen_text) {
        tooltip += "Generates " + gen_text.trim().replace(/.$/, ".") + "<br />";
    }

    let mults = [];
    Object.keys(buildings[name].multipliers).forEach(function (key) {
        mults.push("" + format_num(buildings[name].multipliers[key] * 100) + "% bonus to " + key.replace(/\_/g, " "));
    });
    let mult_str = "<span style='color: goldenrod'>Gives a " + mults.join(", a ") + ".</span>";
    if (mults.length) {
        tooltip += mult_str + "<br />";
    }

    let cost_text: string = "Costs ";
    Object.keys(buildings[name].base_cost).forEach(function (key) {
        /* Total cost for a buy all. Uses a nice summation formula. */
        let cost = buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount - buildings[name].free) * (1 - Math.pow(buildings[name].price_ratio[key], amount)) / (1 - buildings[name].price_ratio[key]);
        if (Math.pow(buildings[name].price_ratio[key], buildings[name].amount + amount - 1 - buildings[name].free) == Infinity && !isNaN(cost)) {
            cost = Infinity;
        }
        if (cost > resources[key].amount) {
            cost_text += "<span style='color: red'>"
        } else if (isNaN(cost)) {
            cost_text += "<span style='color: green'>";
        } else {
            cost_text += "<span>"
        }
        cost_text += format_num(cost, false) + " " + key.replace("_", " ") + "</span>, ";
    });
    if (cost_text == "Costs ") { cost_text = "Unbuyable,"; } /* Free buildings don't have a cost. */
    tooltip += cost_text.trim().replace(/.$/, ".");

    let flavor_text: string = "<hr><i style='font-size: small'>" + buildings[name].flavor + "</i>";
    if (buildings[name].flavor == undefined || buildings[name].flavor == "") {
        flavor_text = "";
    }
    tooltip += flavor_text;

    return tooltip;
}

function purchase_building(name: string, amount = null) {
    /* Sometimes we're calling this to update amount shown, so make sure we do so. */
    $('#building_' + name + " > .building_amount").html(format_num(buildings[name].amount, false));

    if (amount == null) {
        amount = parseInt($("#buy_amount").val());
    }
    if (isNaN(amount)) { amount = 1; }
    if (amount < 0) { amount = 0; }

    /* Make sure not unbuyable. */
    if ($.isEmptyObject(buildings[name].base_cost)) {
        throw Error("Unbuyable building");
    }
    /* Make sure they have enough to buy it */
    Object.keys(buildings[name].base_cost).forEach(function (key) {
        console.log("Checking money");
        let cost = buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount - buildings[name].free) * (1 - Math.pow(buildings[name].price_ratio[key], amount)) / (1 - buildings[name].price_ratio[key]);
        /* Make it so they can't buy above what they should be able to get. */
        if (Math.pow(buildings[name].price_ratio[key], buildings[name].amount + amount - 1 - buildings[name].free) == Infinity && !isNaN(cost)) {
            cost = Infinity;
        }
        if (cost > resources[key].amount) {
            add_log_elem("You can't afford that. Missing: " + key.replace("_", " "));
            throw Error("Not enough resources!");
        } else if (isNaN(cost)) {
            add_log_elem("Sorry, but " + key.replace("_", " ") + " is not fuzzy.");
            throw Error("fuzzy resources!");
        }
    });

    /* Spend money to buy */
    Object.keys(buildings[name].base_cost).forEach(function (key) {
        console.log("Spending money");
        let cost = buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount - buildings[name].free) * (1 - Math.pow(buildings[name].price_ratio[key], amount)) / (1 - buildings[name].price_ratio[key]);
        resources[key].amount -= cost;
    });

    /* Turn off, add building, turn back on. */
    let build_state = buildings[name].on;
    if (build_state) {
        toggle_building_state(name);
    }
    buildings[name].amount += amount;
    if (build_state) {
        toggle_building_state(name);
    }

    $('#building_' + name + " > .building_amount").html(format_num(buildings[name].amount, false));
}

function destroy_building(name: string, amount = null) {
    if (amount == null) {
        amount = parseInt($("#buy_amount").val());
    }
    if (isNaN(amount)) { amount = 1; }
    for (let i = 0; i < amount; i++) {
        if (buildings[name].amount <= 1) {
            add_log_elem("You can't destroy your last building.");
            return; /* Can't sell last building */
        }
        /* Remove resource gen */
        let build_state = buildings[name].on;
        if (build_state) {
            toggle_building_state(name);
        }
        buildings[name].amount--;
        if (build_state) {
            toggle_building_state(name);
        }
        /* Refund resources a bit. Get 30% back. */
        Object.keys(buildings[name].base_cost).forEach(function (key) {
            resources[key].amount += 0.3 * buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount - 1 - buildings[name].free);
        });

        $('#building_' + name + " > .building_amount").html(format_num(buildings[name].amount, false));
    }

}

function purchase_upgrade(name: string) {
    let upg = remaining_upgrades[name];

    /* Check that they have enough */
    Object.keys(upg.cost).forEach(function (resource) {
        if (resources[resource].amount < upg.cost[resource]) { /* Don't have enough to buy upgrade */
            add_log_elem("Not enough resources! Missing: " + resource.replace("_", " "));
            throw Error("Not enough resources!");
        }
    });

    /* Spend it */
    Object.keys(upg.cost).forEach(function (resource) {
        resources[resource].amount -= upg.cost[resource];
    });

    /* Do cleanup. Get benefit from having it, remove it from purchasable upgrades, add it to purchased upgrades, remove from page */
    upg.purchase();

    if (!upg.repeats) {
        purchased_upgrades.push(name);
        let upg_name = remaining_upgrades[name].name;
        delete remaining_upgrades[name];
        update_total_upgrades(upg_name);
        $("#upgrade_" + name).remove();
    } else {
        $("#upgrade_" + name).addClass("hidden");
    }
}

function random_title() {
    const TITLES = [
        "CrappyIdle v.π²",
        "Drink Your Ovaltine!",
        "(!) Not Responding (I lied)",
        "17 New Resources That Will Blow Your Mind!",
        "Ÿ̛̦̯ͬ̔̾̃ͥ͑o͋ͩ̽̓͋̚͘u͚̼̜̞͉͓̹ͦ͒͌̀ ̄͋̉̓҉̖̖̠̤ņ͔̄͟͟e̦̝̻̼̖͖͋̓̔̓͒ͬe̷͈̗̻̘̩̙̖͗ͫͭͮ͌̃́ͬ̔d̥̞ͨ̏͗͆̉ͩ ̨̟̭̻͔̰͓͍̤͍̀ͤͤ̎͐͘͠m͙͈͖̱͍̖̤͑̃͐͋ͪ̐ͯ̏͘ͅȍ̼̭̦͚̥̜͉̥̱ͬ͞r̥̣̰͈̻̰ͮ̓̚e̳͊ͯ͞ ̏ͯ̈́҉̛̮͚̖͈̼g̩͖̙̞̮̟̍ͦͫ̓ͭͥ̀o̧̻̞̰͉̤͇̭̘͓ͨ̆̔ͨl̴͕͉̦̩̟̤̰̃͋̃̉̓͌ͪ͌ͩd̢̨̲̻̿ͫ",
        "Help im trapped in an html factory",
        "This title dedicated to /u/GitFlucked who really didn't like the previous one.",
        "Try Foodbits! They're super tasty*! *ᴾᵃʳᵗ ᵒᶠ ᵃ ᶜᵒᵐᵖˡᵉᵗᵉ ᵇʳᵉᵃᵏᶠᵃˢᵗ⋅ ᴺᵒᵗ ᶠᵒʳ ʰᵘᵐᵃⁿ ᶜᵒⁿˢᵘᵐᵖᵗᶦᵒⁿ⋅ ᴰᵒ ⁿᵒᵗ ᶜᵒⁿˢᵘᵐᵉ ʷʰᶦˡᵉ ᵘⁿᵈᵉʳ ᵗʰᵉ ᶦⁿᶠˡᵘᵉⁿᶜᵉ ᵒᶠ ᵈʳᵘᵍˢ ᵒʳ ᵃˡᶜᵒʰᵒˡ⋅ ᴼʳ ᵃᶦʳ⋅",
        "BUY ME MORE JEWELRY!",
        "Beware the space squid",
        "Now with more kittens",
        "Technomancy",
        "You grew a CARROT! Your mother is so proud!",
        "Strangely Bubbling Potion of Dancing",
        "...",
        "Technomancy: Now with meta-bugs",
        "Even the bugs have bugs.",
    ];
    document.title = TITLES.filter(item => item !== document.title)[Math.floor(Math.random() * (TITLES.length - 1))];

}

function change_theme(new_theme: string) {
    let themes = {
        "light": ".bgc {background-color: white;}.fgc {color: black;}.bgc_second {background-color: #CCC;}",
        "dark": ".bgc {background-color: black;}.fgc {color: lightgray;}.bgc_second {background-color: #333;}",
        "halloween": ".bgc {background-color: black;}.fgc {color: darkorange;}.bgc_second {background-color: purple;}",
        "christmas": ".bgc {background-color: #400;}.fgc {color: #0A0;} .bgc_second {background-color: #050;}",
        "crazy": "                                              \
          .bgc, .bgc_second, .fgc {                             \
            animation: strobe 750ms infinite;                  \
          }                                                     \
          @keyframes strobe {                                   \
              16% { background: red; color: blue; }             \
              33% { background: orange; color: purple;}         \
              50% { background: yellow; color: red; }           \
              66% { background: green; color: orange; }         \
              83% { background: blue; color: yellow; }          \
              100% { background: purple; color: green; }        \
              0%  { background: purple; color: green; }         \
          }                                                     \
         ",
    };
    let theme_music = {
        "light": "",
        "dark": "",
        "halloween": "",
        "christmas": "JXjQO0UixxM",
        "crazy": "MTrzTABzLfY",
    }
    /* Make sure the theme exists */
    if (themes[new_theme]) {
        /* Set a <style> field in the document. */
        $("#color_theme").html(themes[new_theme]);
        /* Remember what theme */
        localStorage["theme"] = new_theme;
        /* Play music for it (or stop music if there is none) */
        if (theme_music[new_theme]) {
            $("#music").html("<iframe width='0' height='0' src='https://www.youtube.com/embed/" + theme_music[new_theme] + "?autoplay=1&loop=1&playlist=" + theme_music[new_theme] + "&start=1' frameborder='0'></iframe>")
        } else {
            $("#music").html("");
        }
        /* Set the select box. This is really just for loading, but best to make sure. */
        $("#theme_select").val(new_theme);
    }
}

/**
 * Maps Grouping name => buildings affected. 
 */
let groupings = {};
function setup_groups() {
    /* Add all on/off */
    groupings["All"] = Object.keys(buildings);
    /* Remove spell buildings from this. */
    SPELL_BUILDINGS.forEach(function (build) {
         groupings["All"].splice(groupings["All"].indexOf(build), 1);
    });
    /* Ugh. We have to make a copy. Because otherwise we modify SPELL_BUILDINGS, even though it's marked as const. */
    groupings["Spells"] = JSON.parse(JSON.stringify(SPELL_BUILDINGS));
    groupings["Spells"].splice(groupings["Spells"].indexOf("s_manastone"), 1);
    groupings["Spells"].splice(groupings["Spells"].indexOf("s_mana_refinery"), 1);
    groupings["Spells"].splice(groupings["Spells"].indexOf("s_final"), 1); /* This building isn't officially a thing yet and we don't want it on. */

    /* Clear group name box*/
    $("#group_names").html("<table></table>");
    Object.keys(groupings).forEach(function (grouping) {
        $("#group_names > table").append("<tr></tr>");
        $("#group_names tr").last().append("<td style='overflow: auto; max-width: 5em;'>" + grouping + "</td>");
        /* Can't edit the default filters. */
        if (grouping != "All" && grouping != "Spells") {
            $("#group_names tr").last().append("<td><span class='clickable'>Edit</span></td>");
            $("#group_names span").last().click(function () {
                draw_group(grouping);
            });
        } else {
            $("#group_names tr").last().append("<td></td>");
        }
        $("#group_names tr").last().append("<td><span class='clickable' style='background-color: green;'>On</span></td>");
        $("#group_names span").last().click(function () {
            let failed = false;
            groupings[grouping].forEach(function (build) {
                /* Turn them all on. Note if we failed. */
                if (!buildings[build].on && toggle_building_state(build)) {
                    failed = true;
                }
            });
            if (failed) {
                alert("Turning all on failed.");
            }
        });
        $("#group_names tr").last().append("<td><span class='clickable' style='background-color: red;'>Off</span></td>");
        $("#group_names span").last().click(function () {
            groupings[grouping].forEach(function (build) {
                /* Turn them all off. */
                if (buildings[build].on) {
                    toggle_building_state(build);
                }
            });
        });
    });
    $("#group_names").append("<span class='clickable' style='position: relative; left: 6em;'>+</span>");
    $("#group_names > span").last().click(function () {
        let group_name = prompt("What will you name your group?").trim();
        /* New group and has a name */
        if (group_name && groupings[group_name] == undefined) {
            if (groupings[group_name] == undefined) {
                groupings[group_name] = [];
            }
            setup_groups();
            draw_group(group_name);
        }
    });
}

function draw_group(name: string) {
    /* Clear old stuff and say what we're editing. */
    $("#group_data").html("");
    $("#group_data").html("<div style='text-align: center; border-bottom: solid 1px;'>" + name + " <span class='clickable'>Delete</span></div>");
    $("#group_data > div > span").click(function () {
        if (confirm("Really delete group " + name + "?")) {
            delete groupings[name];
            setup_groups();
            $("#group_data").html("");
        }
    });
    /* Now show every building (that they can see) and if it's in or not.
        We're also specifically excluding two buildings because they should never be able to be turned off.
    */
    Object.keys(buildings).forEach(function (build) {
        if (build != "s_manastone" && build != "s_mana_refinery" && !$("#building_" + build).parent().hasClass("hidden")) {
            /* Get the name */
            let b_name = $("#building_" + build + " .building_name").text();
            /* Get the color. Red if not in the grouping, green if it is. */
            let color = groupings[name].indexOf(build) == -1 ? "red" : "green";
            /* Add the element */
            $("#group_data").append("<span class='clickable' style='color:" + color + "'>" + b_name + "</span><br/>");
            /* Add the onclick handler to add/remove it from the group. */
            $("#group_data > span").last().click(function () {
                /* Check if it's in the group or not. */
                if (groupings[name].indexOf(build) == -1) {
                    groupings[name].push(build);
                } else {
                    groupings[name].splice(groupings[name].indexOf(build), 1);
                }
                draw_group(name);
            });
        }
    });
}

let rules = {};
function setup_rules() {
    /* Clear group name box*/
    $("#rule_names").html("<table></table>");
    if (adventure_data["auto_events"] != undefined) {
        $("#rule_names > table").append("<tr></tr>");
        $("#rule_names tr").last().append("<td style='overflow: auto; max-width: 5em;'>AutoEvent</td>");
        $("#rule_names tr").last().append("<td><span class='clickable'>Edit</span></td>");
        $("#rule_names span").last().click(function () {
            draw_erule();
        });
    }
    Object.keys(rules).forEach(function (rule) {
        $("#rule_names > table").append("<tr></tr>");
        $("#rule_names tr").last().append("<td style='overflow: auto; max-width: 5em;'>" + rule + "</td>");
        /* Can't edit the default filters. */
        $("#rule_names tr").last().append("<td><span class='clickable'>Edit</span></td>");
        $("#rule_names span").last().click(function () {
            draw_rule(rule);
        });
        $("#rule_names tr").last().append("<td><span class='clickable' style='background-color: " + (rules[rule].active ? "green" : "red") + "'>" + (rules[rule].active ? "On" : "Off") + "</span></td>");
        $("#rule_names span").last().click(function () {
            rules[rule].active = !rules[rule].active;
            $(this).html(rules[rule].active ? "On" : "Off");
            $(this).css("background-color", rules[rule].active ? "green" : "red");
        });
        $("#rule_names tr").last().append("<td><span class='clickable'>Delete</span></td>");
        $("#rule_names span").last().click(function () {
            if (confirm("Really delete rule " + rule + "?")) {
                delete rules[rule];
                setup_rules();
                if (rule + " Delete" == $("#rule_data > div").first().text()) {
                    $("#rule_data").html("");
                }
            }
        });
    });
    $("#rule_names").append("<span class='clickable' style='position: relative; left: 6em;'>+</span>");
    $("#rule_names > span").last().click(function () {
        let rule_name = prompt("What will you name your rule?").trim();
        /* New rule and has a name */
        if (rule_name && rules[rule_name] == undefined) {
            if (rules[rule_name] == undefined) {
                rules[rule_name] = {
                    active: false,
                    main_group: "All",
                    on_off: "on",
                    resource: "time",
                    res_comp: ">",
                    res_amt: 0,
                    fail_group: "All",
                    fail_on_off: "on"
                };
            }
            setup_rules();
            draw_rule(rule_name);
        }
    });
}

function draw_rule(name: string) {
    /* Clear old stuff and say what we're editing. */
    $("#rule_data").html("");
    $("#rule_data").html("<div style='text-align: center; border-bottom: solid 1px;'>" + name + " <span class='clickable'>Delete</span></div>");
    $("#rule_data > div > span").click(function () {
        if (confirm("Really delete rule " + name + "?")) {
            delete rules[name];
            setup_groups();
            $("#rule_data").html("");
        }
    });

    /* Oh god this. It just sets up some nice stuff for us. 
        "Turn grouping [group] [on|off] when [resource] is [>|<] [value]"
    */
    $("#rule_data").append("Turn grouping " +
        "<select id='group_select' class='fgc bgc_second'></select>" +
        "<select id='rule_on_off' class='fgc bgc_second'><option>on</option><option>off</option></select> when " +
        "<select id='resource_select' class='fgc bgc_second'> </select> amount <br />is " +
        "<select id='rule_when' class='fgc bgc_second'><option>&gt;</option><option>&lt;</option></select> " +
        "<input  id='rule_amt' type='number' class='fgc bgc_second' style= 'border: solid 1px;'> </input><br />");
    $("#rule_data").append("On failure, turn grouping " +
        "<select id='fail_group_select' class='fgc bgc_second'></select>" +
        "<select id='fail_on_off' class='fgc bgc_second'><option>on</option><option>off</option></select><br /> ");
    $("#rule_data").append("<span class='clickable' style='background-color: green'>Save Rule</span>");
    Object.keys(groupings).forEach(function (group) {
        $("#group_select").append("<option>" + group + "</option>");
        $("#fail_group_select").append("<option>" + group + "</option>");
    });

    Object.keys(resources).forEach(function (res) {
        if (resources[res].amount != 0 || resources_per_sec[res] != 0 || rules[name].resource == res) {
            $("#resource_select").append("<option>" + res.replace(/\_/g, " ") + "</option>");
        }
    });

    /* Show if pending edits exist */
    $("#rule_data > select, input").change(() => $("#rule_data > span").last().css("background-color", "red"));

    /* Save it. */
    $("#rule_data > span").last().click(function () {
        rules[name] = {
            active: rules[name]["active"],
            main_group: $("#group_select").val(),
            on_off: $("#rule_on_off").val(),
            resource: $("#resource_select").val(),
            res_comp: $("#rule_when").val(),
            res_amt: parseInt($("#rule_amt").val()),
            fail_group: $("#fail_group_select").val(),
            fail_on_off: $("#fail_on_off").val()
        };
        $(this).css("background-color", "green");
    });

    /* Set values */
    $("#group_select").val(rules[name]["main_group"]);
    $("#rule_on_off").val(rules[name]["on_off"]);
    $("#resource_select").val(rules[name]["resource"]);
    $("#rule_when").val(rules[name]["res_comp"]);
    $("#rule_amt").val(rules[name]["res_amt"]);
    $("#fail_group_select").val(rules[name]["fail_group"]);
    $("#fail_on_off").val(rules[name]["fail_on_off"]);
}

let erules = [];
function draw_erule() {
    $("#rule_data").html("Note: Titles are matched using <a href='https://www.regular-expressions.info/tutorial.html' target='_blank' class='fgc'>regular expressions.</a><br />");
    erules = erules.filter(rule => rule[0] != "" || rule[1] != "");
    erules.push(["", ""]);
    let i = 0;
    erules.forEach(function (rule) {
        let index = i;
        $("#rule_data").append("<span id='rule_" + i.toString() + "'>Events with title <input type='text' class='fgc bgc_second'></input> will choose option number <input type='number' class='fgc bgc_second'></input></span><br />");
        $("#rule_data #rule_" + i.toString() + " input").first().change(function (e) {
            rule[0] = $(this).val();
        });
        $("#rule_data #rule_" + i.toString() + " input").first().val(rule[0]);

        $("#rule_data #rule_" + i.toString() + " input").last().change(function (e) {
            rule[1] = $(this).val();
        });
        $("#rule_data #rule_" + i.toString() + " input").last().val(rule[1]);

        i++;
    });
    $("#rule_data").append("<span class='clickable'>+</span>");
    $("#rule_data span").last().click(function () {
        draw_erule();
    });
}

function run_rules() {
    Object.keys(rules).forEach(function (rname) {
        let rule = rules[rname];
        if (rule["active"]) { /* It's turned on, so we need to run it. */
            /* Check the condition. Set up a dict of funcs so we can easily compare. */
            const compares = { "<": (a, b) => a < b, ">": (a, b) => a > b };
            /* Check if the rule turns out to match. So if the proper comparison with the actual resource (need to get _s back) succeeds...*/
            if (compares[rule["res_comp"]](resources[rule["resource"].replace(/\s/g, "_")].amount, rule["res_amt"])) {
                /* Now we attempt to turn the grouping on/off */
                if (rule["on_off"] == "on") {
                    let failed = false;
                    groupings[rule["main_group"]].forEach(function (build) {
                        /* Turn them all on. Note if we failed. */
                        if (!buildings[build].on && toggle_building_state(build)) {
                            failed = true;
                        }
                    });
                    if (failed) {
                        groupings[rule["fail_group"]].forEach(function (build) {
                            /* Turn them all on/off. */
                            if (buildings[build].on) {
                                if (rule["fail_on_off"] == "off") {
                                    toggle_building_state(build);
                                }
                            } else if (rule["fail_on_off"] == "on"){
                                toggle_building_state(build);
                            }
                        });
                    } /* Whew! Not turning stuff on and trying to fail is done. */
                } else {
                    groupings[rule["main_group"]].forEach(function (build) {
                        /* Turn them all off. */
                        if (buildings[build].on) {
                            toggle_building_state(build);
                        }
                    });
                }
            } /* End turn grouping on/off*/
        }
    });
}

function prng(seed: number): number {
    if (seed <= 0) { seed = 1234567; }
    return seed * 16807 % 2147483647;
}

window.onload = () => {
    set_initial_state();
    load();

    setInterval(update, 50);

    /* Add upgrades to be unhidden*/
    /* Loop through all remaining upgrades */
    Object.keys(remaining_upgrades).forEach(function (upg_name) {
        let upg_elem: string = "<li id='upgrade_" + upg_name + "' class='upgrade tooltip fgc bgc_second' onclick=\"purchase_upgrade('" + upg_name +"')\" style='text-align: center;'><span>" + remaining_upgrades[upg_name].name + "<br />";
        /* Stops error message spamming in the console if an unlocked upgrade has no image. */
        if (remaining_upgrades[upg_name].image) {
            upg_elem += "<img src='images/" + remaining_upgrades[upg_name].image + "' alt='' style='width: 3em; height: 3em; float: bottom;' />";
        }
        upg_elem += "</span><span class='tooltiptext fgc bgc_second' style='opacity: 1;'>" + remaining_upgrades[upg_name].tooltip + "</span></li>";
        $("#upgrades > ul").append(upg_elem);

    });
    update_upgrade_list();
    setInterval(update_upgrade_list, 500);

    /* Set prestige button updates. So you see how much mana you would get. */
    prestige.update();
    setInterval(prestige.update, 1000);

    random_title();
    setInterval(random_title, 600000);

    SPELL_BUILDINGS.forEach(function (build) {
        if (buildings["s_manastone"].amount * 2 < buildings[build].amount * -buildings[build].generation["mana"]) {
            $("#building_" + build).parent().addClass("hidden");
        }
    });

    /* Give spell rewards */
    if (buildings["s_manastone"].amount > 0 && event_flags["start_buildings"] == undefined) {
        event_flags["start_buildings"] = true;
        if (resources["money"].amount < 10) {
            resources["money"].amount = 10;
        }
        if (buildings["s_manastone"].amount >= 400) {
            resources["fuel"].amount += 0.3;
        }

        /* What building each mana gives. */
        let start_buildings =["bank","mine","bank","logging","bank","mine","bank","logging","furnace","gold_finder","bank","mine","bank","logging","bank","mine","bank","logging","compressor","","","","","oil_well","bank","bank","bank","bank","oil_well","","","","","library","library","library","library","library","library","bank","bank","bank","mine","bank","logging","bank","mine","bank","logging","","","","","oil_engine","solar_panel","solar_panel","solar_panel","solar_panel","bank","mine","bank","logging","bank","mine","bank","logging","","","","","skyscraper","bank","skyscraper","bank","skyscraper","bank","skyscraper","bank","bank","mine","bank","logging","bank","mine","bank","logging","bank","mine","bank","logging","bank","mine","bank","logging","furnace","gold_finder","compressor","paper_mill","ink_refinery","paper_mill"];
        /* Only go as much as they have mana for or we boosts exist for. */
        for (let i = 0; i < Math.min(buildings["s_manastone"].amount, start_buildings.length); i++) {
            let bname = start_buildings[i];
            if (bname == "") { continue; }
            let comp_state = buildings[bname].on;
            if (comp_state) {
                toggle_building_state(bname);
            }
            buildings[bname].amount++;
            buildings[bname].free++;

            if (comp_state) { /* Only turn on if it already was on */
                toggle_building_state(bname);
            }
            $("#building_" + bname + "  > .building_amount").html(format_num(buildings[bname].amount, false));
        }
    }
    /* Start our event system */
    let to_next_event = 2 * 60000 + Math.random() * 60000 * 2;
    if (purchased_upgrades.indexOf("more_events") != -1) {
        to_next_event *= .7;
    }
    setTimeout(handle_event, to_next_event);
    setup_events();

    /* Set up for adventure mode requests */
    $.ajaxSetup({
        "async": false,
        "cache": false,
    });
    /* Make sure we have enough hydrogen mines */
    if (buildings["hydrogen_mine"].amount < adventure_data["hydrogen_mines"]) {
        let comp_state = buildings["hydrogen_mine"].on;
        if (comp_state) {
            toggle_building_state("hydrogen_mine");

        }
        buildings["hydrogen_mine"].amount = adventure_data["hydrogen_mines"];
        if (comp_state) { /* Only turn on if it already was on */
            toggle_building_state("hydrogen_mine");
        }
        $("#building_hydrogen_mine  > .building_amount").html(format_num(buildings["hydrogen_mine"].amount, false));
    }
    if (adventure_data["mana_purifier"]) {
        let comp_state = buildings["mana_purifier"].on;
        if (comp_state) {
            toggle_building_state("mana_purifier");
        }
        buildings["mana_purifier"].amount = adventure_data["mana_purifier"];
        if (comp_state) { /* Only turn on if it already was on */
            toggle_building_state("mana_purifier");
        }
        $("#building_mana_purifier  > .building_amount").html(format_num(buildings["mana_purifier"].amount, false));
    }
    setup_groups();

    setup_rules();

    /* Display a welcome back message in case of update */
    $.get("changelog.txt", function (log: string) {
        /* Find the version number */
        let changelog = log.split("\n");
        for (let i = 0; i < changelog.length; i++) {
            /* Find first line with a version number */
            if (changelog[i].match(/v[0-9]+\.[0-9]+\.[0-9]+/)) {
                /* We need to set version number. So just version line without the : */
                $("#version").html(changelog[i].replace(/\:.*/, ""));
                /* Not a new version :( */
                if (changelog[i] == localStorage["last_version"]) { return; }

                $("#events").removeClass("hidden");
                $("#events_topbar").html(changelog[i]);
                $("#events_content").html("Hey, there's a new version! What's new in this version: <br />" + changelog[i + 1]);
                /* Remember they were at this version */
                localStorage["last_version"] = changelog[i];
                /* We don't care about other lines. */
                return;
            }
        }
    });
    /* Setup hotkeys */
    let hotkey_mode = 0;
    $(document).keyup(function (e) {
        /* ESC ALWAYS exits. */
        if (e.key == "Escape" || e.key.toLowerCase() == "x") {
            $("#events").addClass("hidden");
            $("#character").addClass("hidden");
        }
        /* Otherwise, we need to make sure we aren't actually trying to type something */
        if (document.activeElement.tagName == "INPUT") {
            return;
        }

        if (hotkey_mode == 0) {
             if ("1234567890".indexOf(e.key) != -1) {
                if (!$("#events").hasClass("hidden")) {
                    $("#events_content span.clickable")["1234567890".indexOf(e.key)].click();
                }
            } else if (e.key.toLowerCase() == "f") {
                if (!$("#refined_mana").hasClass("hidden")) {
                    $("#refined_mana .res_gen").click();
                }
             } else if (e.key.toLowerCase() == "c") {
                 if (!$("#purified_mana").hasClass("hidden")) {
                     $("#purified_mana .res_gen").click();
                 }
             } else if (e.key.toLowerCase() == "t") {
                if (!$("#time").hasClass("hidden")) {
                    $("#time .res_gen").click();
                }
            } else if (e.key.toLowerCase() == "a") {
                if (!$("#fuel").hasClass("hidden")) {
                    $("#fuel .res_gen").click();
                }
            } else if (e.key.toLowerCase() == "r") {
                if (!$("#building_s_mana_refinery").hasClass("hidden")) {
                    $("#building_s_mana_refinery").click();
                }
            } else if (e.key == "+") {
                if (!$("#building_s_energyboost").hasClass("hidden")) {
                    purchase_building('s_energyboost');
                }
            } else if (e.key == "-") {
                if (!$("#building_s_energyboost").hasClass("hidden")) {
                    destroy_building('s_energyboost');
                }
            }
        } else if (hotkey_mode == 1) {
            /* Potentially add chaining of hotkeys? Maybe for later stuff, but probably good for now. */
        }


    });

    /* Add building prefixes */
    Object.keys(buildings).forEach(function (build) {
        if (buildings[build]["prefix"] != undefined) {
            $("#building_" + build + " .building_prefix").html(buildings[build]["prefix"] + ' ');
        }
    });
    /* Only set to save last in case something messes up. */
    setInterval(save, 30000);

};

function hack(level: number) {
    add_log_elem("You cheater :(");
    Object.keys(resources).forEach(function (r) { resources[r].amount = level });
}
function superhack(level: number) {
    add_log_elem("You filthy cheater :(. You make me sad.");
    Object.keys(resources).forEach(function (r) { resources_per_sec[r] = level });
}
