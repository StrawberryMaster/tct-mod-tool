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
            windowColor: "#bfe6ff",
            containerColor: "#ffffff",
            innerWindowColor: "#e8fbff",
            bannerImageUrl: "https://www.newcampaigntrail.com/static/images/banner_classic.png",
            backgroundImageUrl: "https://www.jetsimon.com/public/static/images/background.jpg",
            gameTitle: "THE CAMPAIGN TRAIL",
            customQuote: "",
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
                windowColor: "#bfe6ff",
                containerColor: "#ffffff",
                innerWindowColor: "#e8fbff",
                bannerImageUrl: "https://www.newcampaigntrail.com/static/images/banner_classic.png",
                backgroundImageUrl: "https://www.jetsimon.com/public/static/images/background.jpg",
                gameTitle: "THE CAMPAIGN TRAIL",
                customQuote: "",
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

    exportCode1() {
        let code = "";
        
        const electionPk = this.elections[0]?.pk || 20;

        // export elections
        code += "campaignTrail_temp.election_json = " + JSON.stringify(this.elections, null, 4) + ";\n\n";
        
        // export temp election list
        code += "campaignTrail_temp.temp_election_list = " + JSON.stringify(this.temp_election_list, null, 4) + ";\n\n";
        
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
        let quoteHtml = jd.customQuote ? `<font id="wittyquote" size="4" color="white"><em>${jd.customQuote}</em></font>` : "";
        
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
      .inner_window_w_desc { background-color: ${jd.innerWindowColor} !important; }
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
        // Mock objects to catch the eval output
        const campaignTrail_temp = {};
        let jet_data = null;
        
        try {
            // strip //@startcode and //@endcode if they exist
            if(fileContent.includes("//#startcode")) {
                fileContent = fileContent.split("//#startcode")[0] + fileContent.split("//#endcode")[1];
            }
            
            // eval the content
            eval(fileContent);
            
            if (campaignTrail_temp.election_json) this.elections = campaignTrail_temp.election_json;
            if (campaignTrail_temp.candidate_json) this.candidates = campaignTrail_temp.candidate_json;
            if (campaignTrail_temp.running_mate_json) this.running_mates = campaignTrail_temp.running_mate_json;
            if (campaignTrail_temp.global_parameter_json) this.global_parameters = campaignTrail_temp.global_parameter_json;
            if (campaignTrail_temp.temp_election_list) this.temp_election_list = campaignTrail_temp.temp_election_list;
            if (campaignTrail_temp.credits) this.credits = campaignTrail_temp.credits;
            
            if (jet_data) {
                this.jet_data = Object.assign({}, this.jet_data, jet_data);
            }
            
            return true;
        } catch (e) {
            console.error("Error loading Code 1:", e);
            return false;
        }
    }
}

window.TCTCode1Data = TCTCode1Data;

// global reference for component registration
window.TCT1ComponentQueue = [];
window.registerCode1Component = function(name, definition) {
    if (window.TCTApp1) {
        window.TCTApp1.component(name, definition);
    } else {
        window.TCT1ComponentQueue.push({ name, definition });
    }
};
