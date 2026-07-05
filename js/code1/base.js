"use strict";

class TCTCode1Data {
    constructor() {
        this.elections = [];
        this.candidates = [];
        this.running_mates = [];
        this.global_parameters = [];
        this.temp_election_list = [];
        this.credits = "Not Dan Bryan";
        this.jet_data = {
            headerColor: "#700016",
            headerTextColor: "#ffffff",
            windowColor: "#bfe6ff",
            containerColor: "#ffffff",
            innerWindowColor: "#e8fbff",
            innerWindowTextColor: "#000000",
            descriptionWindowColor: "#f8f8f8",
            descriptionWindowTextColor: "#000000",
            startButtonColor: "#ffa0a0",
            bannerImageUrl: "https://www.newcampaigntrail.com/static/images/banner_classic.png",
            backgroundImageUrl: "https://www.jetsimon.com/public/static/images/background.jpg",
            gameTitle: "THE CAMPAIGN TRAIL",
            customQuote: "",
            quoteTextColor: "#ffffff",
            endingTextColor: "#000000"
        };

        this.loadDefaultData();
        this.templates = [];
    }

    async fetchTemplates() {
        console.log("Fetching templates...");
        try {
            const resp = await fetch('js/code1/data/election.json');
            if (!resp.ok) {
                console.error("Fetch failed with status:", resp.status);
                return;
            }
            const data = await resp.json();
            console.log("Templates fetched successfully, count:", data.length);

            // reversing raw data first
            data.sort((a, b) => (b.fields.year || 0) - (a.fields.year || 0));

            // clear and push to trigger reactivity properly
            this.templates.length = 0;
            this.templates.push(...data);
            console.log("Templates array populated. Current length:", this.templates.length);
        } catch (e) {
            console.error("Error in fetchTemplates:", e);
        }
    }

    async applyTemplate(electionPk) {
        try {
            const [candResp, rmResp] = await Promise.all([
                fetch('js/code1/data/candidate.json'),
                fetch('js/code1/data/running_mate.json')
            ]);
            const allCandidates = await candResp.json();
            const allRunningMates = await rmResp.json();

            const election = this.templates.find(e => e.pk == electionPk);
            if (!election) return false;

            this.elections = [JSON.parse(JSON.stringify(election))];
            if (!this.elections[0].fields.display_year) {
                this.elections[0].fields.display_year = String(this.elections[0].fields.year);
            }
            if (this.elections[0].fields.recommended_reading_enabled == null) {
                this.elections[0].fields.recommended_reading_enabled = true;
            }

            // update temp_election_list too
            this.temp_election_list = [{
                "id": election.pk,
                "year": election.fields.year,
                "is_premium": 0,
                "display_year": election.fields.display_year || String(election.fields.year)
            }];

            this.candidates = allCandidates.filter(c => c.fields.election == electionPk);

            const candPks = new Set(this.candidates.map(c => c.pk));
            this.running_mates = allRunningMates.filter(rm =>
                candPks.has(rm.fields.candidate) || candPks.has(rm.fields.running_mate)
            );

            // mark candidates as running mates if they appear in the running_mate table
            const rmPksSet = new Set(this.running_mates.map(rm => rm.fields.running_mate));
            this.candidates.forEach(c => {
                c.fields.running_mate = rmPksSet.has(c.pk);
            });

            this.credits = "Dan Bryan";

            // reset theme to defaults for templates
            this.jet_data = {
                headerColor: "#700016",
                headerTextColor: "#ffffff",
                windowColor: "#bfe6ff",
                containerColor: "#ffffff",
                innerWindowColor: "#e8fbff",
                innerWindowTextColor: "#000000",
                descriptionWindowColor: "#f8f8f8",
                descriptionWindowTextColor: "#000000",
                startButtonColor: "#e8e8e8",
                bannerImageUrl: "https://www.newcampaigntrail.com/static/images/banner_classic.png",
                backgroundImageUrl: "https://www.jetsimon.com/public/static/images/background.jpg",
                gameTitle: "THE CAMPAIGN TRAIL",
                customQuote: "",
                quoteTextColor: "#ffffff",
                endingTextColor: "#000000"
            };

            return true;
        } catch (e) {
            console.error("Error applying template:", e);
            return false;
        }
    }

    loadDefaultData() {
        this.elections = [
            {
                "model": "campaign_trail.election",
                "pk": 20,
                "fields": {
                    "year": 2016,
                    "display_year": "2016",
                    "summary": "Put election description here. You can use html tags here too.",
                    "image_url": "https://www.jetsimon.com/public/exampleelection.png",
                    "winning_electoral_vote_number": 270,
                    "advisor_url": "123",
                    "recommended_reading": "<ul>\n<li><a href=https://www.chicagotribune.com/opinion/editorials/ct-edit-chicago-tribune-biden-endorsement-20200925-lnyxsb5qvrftnjjmj3rnzj33jy-story.html>Our Case For Joe Biden</a></li>\n</ul>",
                    "recommended_reading_enabled": true,
                    "has_visits": 1,
                    "no_electoral_majority_image": "../static/images/2012-no-majority.jpg"
                }
            }
        ];

        this.candidates = [
            {
                "model": "campaign_trail.candidate",
                "pk": 1001,
                "fields": {
                    "first_name": "Mr",
                    "last_name": "President",
                    "election": 20,
                    "party": "Turbo Team",
                    "state": "Idaho",
                    "priority": 1,
                    "description": "<p>Put description here</p>",
                    "color_hex": "#0000FF",
                    "secondary_color_hex": null,
                    "is_active": 1,
                    "image_url": "https://www.jetsimon.com/public/candidateexample.png",
                    "electoral_victory_message": "This guy wins!",
                    "electoral_loss_message": "This guy loses!",
                    "no_electoral_majority_message": "We all win?",
                    "description_as_running_mate": null,
                    "candidate_score": 1,
                    "running_mate": false
                }
            },
            {
                "model": "campaign_trail.candidate",
                "pk": 1002,
                "fields": {
                    "first_name": "Running",
                    "last_name": "Mate",
                    "election": 20,
                    "party": "Turbo Team",
                    "state": "Idaho",
                    "priority": 1,
                    "description": "<p>Put description here</p>",
                    "color_hex": "#0000FF",
                    "secondary_color_hex": null,
                    "is_active": 0,
                    "image_url": "https://www.jetsimon.com/public/candidateexample.png",
                    "electoral_victory_message": "This guy wins!",
                    "electoral_loss_message": "This guy loses!",
                    "no_electoral_majority_message": "We all win?",
                    "description_as_running_mate": "Description as running mate...",
                    "candidate_score": 1,
                    "running_mate": true
                }
            }
        ];

        this.running_mates = [
            {
                "model": "campaign_trail.running_mate",
                "pk": 500,
                "fields": {
                    "candidate": 1001,
                    "running_mate": 1002
                }
            }
        ];

        this.global_parameters = [
            {
                "model": "campaign_trail.global_parameter",
                "pk": 1,
                "fields": {
                    "vote_variable": 1.125,
                    "max_swing": 0.12,
                    "start_point": 0.94,
                    "candidate_issue_weight": 10,
                    "running_mate_issue_weight": 3,
                    "issue_stance_1_max": -0.71,
                    "issue_stance_2_max": -0.3,
                    "issue_stance_3_max": -0.125,
                    "issue_stance_4_max": 0.125,
                    "issue_stance_5_max": 0.3,
                    "issue_stance_6_max": 0.71,
                    "global_variance": 0.01,
                    "state_variance": 0.005,
                    "question_count": 25,
                    "default_map_color_hex": "#C9C9C9",
                    "no_state_map_color_hex": "#999999"
                }
            }
        ];

        this.temp_election_list = [
            {
                "id": 20,
                "year": 2016,
                "is_premium": 0,
                "display_year": "2016"
            }
        ];
    }

    changePk(type, oldPk, newPk) {
        oldPk = Number(oldPk);
        newPk = Number(newPk);
        if (oldPk === newPk || isNaN(oldPk) || isNaN(newPk)) return false;

        if (type === 'candidate') {
            const candidate = this.candidates.find(c => c.pk === oldPk);
            if (!candidate) return false;

            if (this.candidates.some(c => c.pk === newPk)) {
                alert(`PK ${newPk} is already in use by another candidate.`);
                return false;
            }

            candidate.pk = newPk;

            this.running_mates.forEach(rm => {
                if (rm.fields.candidate === oldPk) rm.fields.candidate = newPk;
                if (rm.fields.running_mate === oldPk) rm.fields.running_mate = newPk;
            });

            return true;
        }

        if (type === 'running_mate') {
            const rm = this.running_mates.find(r => r.pk === oldPk);
            if (!rm) return false;

            if (this.running_mates.some(r => r.pk === newPk)) {
                alert(`PK ${newPk} is already in use by another running mate link.`);
                return false;
            }

            rm.pk = newPk;
            return true;
        }

        if (type === 'election') {
            const election = this.elections.find(e => e.pk === oldPk);
            if (!election) return false;

            election.pk = newPk;

            this.candidates.forEach(c => {
                if (c.fields.election === oldPk) c.fields.election = newPk;
            });

            this.temp_election_list.forEach(t => {
                if (t.id === oldPk) t.id = newPk;
            });

            return true;
        }

        return false;
    }

    exportCode1() {
        let code = "";

        const electionPk = this.elections[0]?.pk || 20;

        // export elections
        code += "campaignTrail_temp.election_json = " + JSON.stringify(this.elections, null, 4) + ";\n\n";

        // export temp election list
        code += "campaignTrail_temp.temp_election_list = " + JSON.stringify(this.temp_election_list, null, 4) + ";\n\n";

        if (this.elections[0]?.fields?.recommended_reading_enabled) {
            code += "RecReading = true;\n\n";
        }

        // export credits
        code += "campaignTrail_temp.credits = " + JSON.stringify(this.credits) + ";\n\n";

        // export global parameters
        code += "campaignTrail_temp.global_parameter_json = " + JSON.stringify(this.global_parameters, null, 4) + ";\n\n";

        // export candidates
        code += "campaignTrail_temp.candidate_json = " + JSON.stringify(this.candidates, null, 4) + ";\n\n";

        // export running mates
        code += "campaignTrail_temp.running_mate_json = " + JSON.stringify(this.running_mates, null, 4) + ";\n\n";

        // export opponents
        const activeCandidates = this.candidates.filter(c => !c.fields.running_mate).map(c => c.pk);
        code += "campaignTrail_temp.opponents_default_json = " + JSON.stringify([{ "election": electionPk, "candidates": activeCandidates }], null, 4) + ";\n\n";
        code += "campaignTrail_temp.opponents_weighted_json = " + JSON.stringify([{ "election": electionPk, "candidates": activeCandidates }], null, 4) + ";\n\n";

        // export jet_data (for theming)
        code += "jet_data = " + JSON.stringify(this.jet_data, null, 4) + ";\n\n";

        // export theme injection code
        code += "//#startcode\n";
        code += this.generateThemeCode();
        code += "\n//#endcode\n";

        return code;
    }

    generateThemeCode() {
        const jd = this.jet_data;
        let quoteHtml = jd.customQuote ? `<font id="wittyquote" size="4"><em>${jd.customQuote}</em></font>` : "";

        return `
function applyTheme(theme) {
    const gameHeader = document.querySelector(".game_header");
    if (gameHeader && theme.coloring_title) {
        gameHeader.style.backgroundColor = theme.coloring_title;
    }

    const gameWindow = document.getElementById("game_window");
    if (gameWindow && theme.coloring_window) {
        gameWindow.style.backgroundColor = theme.coloring_window;
    }

    const container = document.querySelector(".container");
    if (container && theme.coloring_container) {
        container.style.backgroundColor = theme.coloring_container;
    }

    const headerImg = document.getElementById("header");
    if (headerImg && theme.header_image) {
        headerImg.src = theme.header_image;
    }

    if (theme.body_background) {
        document.body.style.backgroundImage = \`url("\${theme.body_background}")\`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
    }

    const style = document.createElement("style");
    style.textContent = \`
      #results_container { color: ${jd.endingTextColor}; }
      #wittyquote { color: ${jd.quoteTextColor}; }
      .game_header h2 { color: ${jd.headerTextColor}; }
      .inner_window_w_desc { background-color: ${jd.innerWindowColor} !important; color: ${jd.innerWindowTextColor}; }
      .inner_window_front, .person_description_window, .election_description_window, .description_window_small { background-color: ${jd.descriptionWindowColor} !important; color: ${jd.descriptionWindowTextColor}; }
      .campaign_trail_start_emphasis { background-color: ${jd.startButtonColor} !important; }
    \`;
    document.head.appendChild(style);
}

${jd.gameTitle !== "THE CAMPAIGN TRAIL" || jd.customQuote ? `corrr = '\\n              <h2>${jd.gameTitle}</h2>${quoteHtml}\\n            ';` : ""}

const theme = nct_stuff.themes[nct_stuff.selectedTheme];

// define / override theme values
theme.coloring_title     = "${jd.headerColor}";
theme.coloring_window    = "${jd.windowColor}";
theme.coloring_container = "${jd.containerColor}";
theme.header_image = "${jd.bannerImageUrl}";
theme.body_background = "${jd.backgroundImageUrl}";

applyTheme(theme);
        `.trim();
    }

    loadCode1(fileContent) {
        // initialize empty schema variables
        const campaignTrail_temp = {
            election_json: null,
            candidate_json: null,
            running_mate_json: null,
            global_parameter_json: null,
            temp_election_list: null,
            credits: null,
            modBoxTheme: null
        };

        const mockTheme = {};
        const nct_stuff = {
            themes: {
                classic: mockTheme
            },
            selectedTheme: "classic"
        };

        let RecReading = true;
        let corrr = "";

        const elementStyles = {};
        const elementAttributes = {};
        let capturedStyleText = "";

        // helper mock element generator
        const createMockElement = (id) => {
            if (!elementStyles[id]) elementStyles[id] = {};
            if (!elementAttributes[id]) elementAttributes[id] = {};
            return {
                style: new Proxy(elementStyles[id], {
                    set(target, prop, value) {
                        target[prop] = value;
                        return true;
                    }
                }),
                get textContent() { return capturedStyleText; },
                set textContent(val) { capturedStyleText = val; },
                get src() { return elementAttributes[id].src || ""; },
                set src(val) { elementAttributes[id].src = val; },
                get background() { return elementAttributes[id].background || ""; },
                set background(val) { elementAttributes[id].background = val; },
                setAttribute(attr, val) { elementAttributes[id][attr] = val; },
                appendChild() {},
                removeChild() {},
                querySelector() { return createMockElement('generic-child'); },
                querySelectorAll() { return [createMockElement('generic-child')]; }
            };
        };

        const mockDocument = {
            querySelector(sel) { return createMockElement(sel); },
            querySelectorAll(sel) { return [createMockElement(sel)]; },
            getElementById(id) { return createMockElement(id); },
            getElementsByClassName(cls) { return [createMockElement(cls)]; },
            createElement(tag) { return createMockElement(tag); },
            createTextNode() { return createMockElement('text'); },
            head: createMockElement('head'),
            body: createMockElement('body'),
            addEventListener() {}
        };

        const mockWindow = {
            setInterval() {},
            setTimeout() {},
            addEventListener() {},
            document: mockDocument
        };

        const mockJQuery = function(sel) {
            return [createMockElement(sel)];
        };
        mockJQuery.fn = {};

        const extractColorsFromCSS = (css) => {
            const extracted = {};
            let match;

            match = css.match(/#results_container\s*\{\s*color:\s*([^;!]+)/);
            if (match) extracted.endingTextColor = match[1].trim();

            match = css.match(/#wittyquote\s*\{\s*color:\s*([^;!]+)/);
            if (match) extracted.quoteTextColor = match[1].trim();

            match = css.match(/\.game_header\s+h2\s*\{\s*color:\s*([^;!]+)/);
            if (match) extracted.headerTextColor = match[1].trim();

            match = css.match(/\.inner_window_w_desc\s*\{\s*background-color:\s*([^;!]+)/);
            if (match) extracted.innerWindowColor = match[1].trim();

            match = css.match(/\.inner_window_w_desc\s*\{[^}]*?[^\w-]color:\s*([^;!]+)/);
            if (match) extracted.innerWindowTextColor = match[1].trim();

            match = css.match(/\.inner_window_front[^{]*\{\s*background-color:\s*([^;!]+)/);
            if (match) extracted.descriptionWindowColor = match[1].trim();

            match = css.match(/\.inner_window_front[^{]*\{[^}]*?[^\w-]color:\s*([^;!]+)/);
            if (match) extracted.descriptionWindowTextColor = match[1].trim();

            match = css.match(/\.campaign_trail_start_emphasis\s*\{\s*background-color:\s*([^;!]+)/);
            if (match) extracted.startButtonColor = match[1].trim();

            return extracted;
        };

        try {
            const runSandbox = new Function(
                'campaignTrail_temp', 'nct_stuff', 'document', 'window', '$', 'jQuery',
                `
                let e = campaignTrail_temp;
                let RecReading = true;
                let corrr = "";
                let selectedTheme = nct_stuff.themes[nct_stuff.selectedTheme];
                
                try {
                    ${fileContent}
                } catch(err) {
                    console.warn("Caught runtime exception during sandbox parse, continuing...", err);
                }
                
                return { campaignTrail_temp, nct_stuff, RecReading, corrr };
                `
            );

            const result = runSandbox(
                campaignTrail_temp, nct_stuff, mockDocument, mockWindow, mockJQuery, mockJQuery
            );

            const ct = result.campaignTrail_temp;

            // harvest the standard data sets
            if (ct.election_json) this.elections = ct.election_json;
            if (ct.candidate_json) this.candidates = ct.candidate_json;
            if (ct.running_mate_json) this.running_mates = ct.running_mate_json;
            if (ct.global_parameter_json) this.global_parameters = ct.global_parameter_json;
            if (ct.temp_election_list) this.temp_election_list = ct.temp_election_list;
            if (ct.credits) this.credits = ct.credits;

            if (this.elections?.[0]?.fields) {
                this.elections[0].fields.recommended_reading_enabled = result.RecReading !== false;
                if (result.RecReading && typeof result.RecReading === 'string') {
                    this.elections[0].fields.recommended_reading = result.RecReading;
                }
            }

            // extract theming from modBoxTheme if present
            if (ct.modBoxTheme) {
                const mb = ct.modBoxTheme;
                if (mb.header_color) this.jet_data.headerColor = mb.header_color;
                if (mb.header_text_color) this.jet_data.headerTextColor = mb.header_text_color;
                if (mb.header_image_url) this.jet_data.bannerImageUrl = mb.header_image_url;
                if (mb.description_background_color) {
                    this.jet_data.descriptionWindowColor = mb.description_background_color;
                    this.jet_data.innerWindowColor = mb.description_background_color;
                }
                if (mb.description_text_color) {
                    this.jet_data.descriptionWindowTextColor = mb.description_text_color;
                    this.jet_data.innerWindowTextColor = mb.description_text_color;
                }
                if (mb.main_color) this.jet_data.containerColor = mb.main_color;
                if (mb.secondary_color) this.jet_data.windowColor = mb.secondary_color;
            }

            // extract theming from nct_stuff overrides
            const finalTheme = result.nct_stuff.themes[result.nct_stuff.selectedTheme] || {};
            if (finalTheme.coloring_title) this.jet_data.headerColor = finalTheme.coloring_title;
            if (finalTheme.coloring_window) this.jet_data.windowColor = finalTheme.coloring_window;
            if (finalTheme.coloring_container) this.jet_data.containerColor = finalTheme.coloring_container;
            if (finalTheme.header_image) this.jet_data.bannerImageUrl = finalTheme.header_image;
            if (finalTheme.body_background) this.jet_data.backgroundImageUrl = finalTheme.body_background;

            // extract theming from captured DOM/jQuery manipulations
            if (elementStyles['.container']?.backgroundColor) {
                this.jet_data.containerColor = elementStyles['.container'].backgroundColor;
            }
            if (elementStyles['#game_window']?.backgroundColor) {
                this.jet_data.windowColor = elementStyles['#game_window'].backgroundColor;
            }
            if (elementStyles['#game_window']?.backgroundImage) {
                const bgStr = elementStyles['#game_window'].backgroundImage;
                const match = bgStr.match(/url\(['"]?([^'")]+)['"]?\)/);
                if (match) this.jet_data.backgroundImageUrl = match[1];
            }
            if (elementAttributes['header']?.src) {
                this.jet_data.bannerImageUrl = elementAttributes['header'].src;
            }
            if (elementAttributes['body']?.background) {
                this.jet_data.backgroundImageUrl = elementAttributes['body'].background;
            }

            // extract from CSS block
            if (capturedStyleText) {
                const extracted = extractColorsFromCSS(capturedStyleText);
                Object.assign(this.jet_data, extracted);
            }

            // extract quote and game title from corrr if it was generated
            if (result.corrr) {
                const titleMatch = result.corrr.match(/<h2>(.*?)<\/h2>/i);
                if (titleMatch) {
                    this.jet_data.gameTitle = titleMatch[1];
                }
                const quoteMatch = result.corrr.match(/<font id=['"]wittyquote['"][^>]*><em>(.*?)<\/em><\/font>/i);
                if (quoteMatch) {
                    this.jet_data.customQuote = quoteMatch[1];
                }
            }

        } catch (sandboxError) {
            console.error("Sandbox evaluation failed, falling back to regex scanning...", sandboxError);
        }

        // fallback regex parsing layer
        const source = typeof fileContent === 'string' ? fileContent.replace(/\r\n/g, '\n') : '';
        const extractString = (regex, fallback) => {
            const match = source.match(regex);
            return match ? match[1] : fallback;
        };

        // if sandbox fails to retrieve core arrays, scan them statically
        if (this.elections.length === 0 || !this.elections[0]) {
            const parseLiteral = (identifier) => {
                const assignmentRe = new RegExp(`(?:campaignTrail_temp|e)\\.${identifier}\\s*=`, 'g');
                let match;
                while ((match = assignmentRe.exec(source)) !== null) {
                    const literalStart = match.index + match[0].length;
                    let i = literalStart;
                    while (i < source.length && /\s/.test(source[i])) i++;
                    const startChar = source[i];
                    if (startChar === '{' || startChar === '[') {
                        let depth = 0;
                        let end = -1;
                        for (let j = i; j < source.length; j++) {
                            if (source[j] === startChar) depth++;
                            else if (source[j] === (startChar === '{' ? '}' : ']')) {
                                depth--;
                                if (depth === 0) {
                                    end = j + 1;
                                    break;
                                }
                            }
                        }
                        if (end !== -1) {
                            try {
                                return new Function(`return (${source.slice(i, end)});`)();
                            } catch {}
                        }
                    }
                }
                return null;
            };

            const electionJson = parseLiteral('election_json');
            const candidateJson = parseLiteral('candidate_json');
            const runningMateJson = parseLiteral('running_mate_json');
            const globalParameterJson = parseLiteral('global_parameter_json');
            const tempElectionList = parseLiteral('temp_election_list');
            const credits = extractString(/(?:campaignTrail_temp|e)\.credits\s*=\s*["']([^"']+)["']/, null);

            if (electionJson) this.elections = electionJson;
            if (candidateJson) this.candidates = candidateJson;
            if (runningMateJson) this.running_mates = runningMateJson;
            if (globalParameterJson) this.global_parameters = globalParameterJson;
            if (tempElectionList) this.temp_election_list = tempElectionList;
            if (credits) this.credits = credits;
        }

        // parse raw jet_data object literal from file content if present
        const jetDataMatch = source.match(/jet_data\s*=\s*(\{[\s\S]*?\})(?:;|\n)/);
        if (jetDataMatch) {
            try {
                const parsedJetData = new Function(`return (${jetDataMatch[1]});`)();
                if (parsedJetData && typeof parsedJetData === 'object') {
                    for (const key in parsedJetData) {
                        if (parsedJetData[key] !== undefined && parsedJetData[key] !== null) {
                            this.jet_data[key] = parsedJetData[key];
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to parse jet_data object literal via regex:", e);
            }
        }

        // fallback regex extractions
        this.jet_data.headerColor = extractString(/coloring_title\s*=\s*["']([^"']+)["']/, this.jet_data.headerColor);
        this.jet_data.windowColor = extractString(/coloring_window\s*=\s*["']([^"']+)["']/, this.jet_data.windowColor);
        this.jet_data.containerColor = extractString(/\.container.*backgroundColor\s*=\s*["']([^"']+)["']/, this.jet_data.containerColor);
        this.jet_data.bannerImageUrl = extractString(/document\.getElementById\("header"\)\.src\s*=\s*["']([^"']+)["']/, this.jet_data.bannerImageUrl);
        this.jet_data.backgroundImageUrl = extractString(/document\.body\.background\s*=\s*["']([^"']+)["']/, this.jet_data.backgroundImageUrl);

        const bgImgMatch = source.match(/#game_window.*backgroundImage\s*=\s*["']url\(([^)]+)\)["']/);
        if (bgImgMatch) {
            this.jet_data.backgroundImageUrl = bgImgMatch[1];
        }

        const quoteMatch = source.match(/id=['"]wittyquote['"].*?><em>(.*?)<\/em>/i);
        if (quoteMatch) {
            this.jet_data.customQuote = quoteMatch[1];
        }

        // extract color modifications from CSS strings literal if present in raw file
        const extractedFallbackColors = extractColorsFromCSS(source);
        for (const key in extractedFallbackColors) {
            if (!extractedFallbackColors[key].includes('${')) {
                this.jet_data[key] = extractedFallbackColors[key];
            }
        }

        return this.elections.length > 0;
    }
}

window.TCTCode1Data = TCTCode1Data;

// global reference for component registration
window.TCT1ComponentQueue = [];
window.registerCode1Component = function (name, definition) {
    if (window.TCTApp) {
        window.TCTApp.component(name, definition);
    } else {
        window.TCT1ComponentQueue.push({ name, definition });
    }
};