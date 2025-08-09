const TEMPLATE_NAMES =
[
    "1844-Clay.txt",
    "1844-Polk.txt",
    "1860-Douglas.txt",
    "1860-Lincoln.txt",
    "1896-Bryan.txt",
    "1896-McKinley.txt",
    "1916-Hughes.txt",
    "1916-Wilson.txt",
    "1948-Dewey.txt",
    "1948-Truman.txt",
    "1960-Kennedy.txt",
    "1960-Nixon.txt",
    "1968-Humphrey.txt",
    "1968-Nixon.txt",
    "1968-Wallace.txt",
    "1976-Carter.txt",
    "1976-Ford.txt",
    "1988-Bush.txt",
    "1988-Dukakis.txt",
    "2000-Bush.txt",
    "2000-Gore.txt",
    "2000-Nader.txt",
    "2012-Obama.txt",
    "2012-Romney.txt",
    "2016-Clinton.txt",
    "2016-Trump.txt",
    "2020-Biden.txt",
    "2020-Trump.txt"
]

class TCTData {
    constructor(questions, answers, issues, state_issue_scores, candidate_issue_score, running_mate_issue_score, candidate_state_multiplier, answer_score_global, answer_score_issue, answer_score_state, answer_feedback, states, highest_pk, jet_data) {
        this.highest_pk = highest_pk
        this.questions = questions
        this.answers = answers
        this.issues = issues
        this.state_issue_scores = state_issue_scores
        this.candidate_issue_score = candidate_issue_score
        this.running_mate_issue_score = running_mate_issue_score
        this.candidate_state_multiplier = candidate_state_multiplier
        this.answer_score_global = answer_score_global
        this.answer_score_issue = answer_score_issue
        this.answer_score_state = answer_score_state
        this.answer_feedback = answer_feedback
        this.states = states
        this.jet_data = jet_data

        this.cleanAllData();
    }

    cleanAllData() {
        this.cleanMap(this.questions);
        this.clean(this.answers);
        this.clean(this.issues);
        this.clean(this.state_issue_scores);
        this.clean(this.candidate_issue_score);
        this.clean(this.running_mate_issue_score);
        this.clean(this.candidate_state_multiplier);
        this.clean(this.answer_score_global);
        this.clean(this.answer_score_issue);
        this.clean(this.answer_score_state);
        this.clean(this.answer_feedback);
        this.clean(this.states);
    }

    cleanMap(map) {
        for (let [key, value] of map) {
            if(typeof value === 'object') {
                this.clean(map.get(key))
            }
        } 
    }

    clean(obj) {
        for (let key in obj) {
            if(!isNaN(obj[key])) {
                obj[key] = Number(obj[key]);
            }
            else if(typeof obj[key] === 'object') {
                this.clean(obj[key])
            }
        }
    }

    cloneQuestion(pk) {
        pk = Number(pk);
        let toClone = this.questions.get(pk)
        let answers = this.getAnswersForQuestion(pk);

        let newPk = this.getNewPk();
        let question = {
            "model": "campaign_trail.question",
            "pk": newPk,
            "fields": {
                "priority": toClone.fields.priority,
                "description": toClone.fields.description,
                "likelihood": toClone.fields.likelihood
            }
        }

        for(let i = 0; i < answers.length; i++) {
            this.cloneAnswer(answers[i], newPk);
        }

        this.questions.set(newPk, question);
        return question;
    }

    // reorder questions by array of PKs (in desired order)
    reorderQuestions(newOrderPks) {
        try {
            const current = Array.from(this.questions.values());
            if (!Array.isArray(newOrderPks) || newOrderPks.length !== current.length) {
                console.warn("reorderQuestions: new order length mismatch");
            }
            const lookup = new Map(current.map(q => [q.pk, q]));
            // validate that provided PKs are all present
            for (const pk of newOrderPks) {
                if (!lookup.has(pk)) {
                    console.warn("reorderQuestions: pk not found in current map:", pk);
                }
            }
            // build ordered question objects; keep any missing ones at the end to be safe
            const ordered = [];
            for (const pk of newOrderPks) {
                const q = lookup.get(pk);
                if (q) ordered.push(q);
            }
            // append any stragglers not in newOrderPks
            if (ordered.length < current.length) {
                const missing = current.filter(q => !newOrderPks.includes(q.pk));
                ordered.push(...missing);
            }
            // mutate the existing map in place
            this.questions.clear();
            for (const q of ordered) {
                this.questions.set(q.pk, q);
            }
        } catch (e) {
            console.error("Error in reorderQuestions:", e);
            throw e;
        }
    }

    cloneAnswer(toClone, newQuestionPk) {
        let newPk = this.getNewPk();
        let answer = {
            "model": "campaign_trail.answer",
            "pk": newPk,
            "fields": {
                "question": newQuestionPk,
                "description": toClone.fields.description
            }
        }
        this.answers[newPk] = answer;

        const feedbacks = this.getAdvisorFeedbackForAnswer(toClone.pk);
        for(let i = 0; i < feedbacks.length; i++) {
            this.cloneFeedback(feedbacks[i], newPk);
        }
        
        const globals = this.getGlobalScoreForAnswer(toClone.pk);
        for(let i = 0; i < globals.length; i++) {
            this.cloneGlobalScore(globals[i], newPk);
        }

        const issueScores = this.getIssueScoreForAnswer(toClone.pk);
        for(let i = 0; i < issueScores.length; i++) {
            this.cloneIssueScore(issueScores[i], newPk);
        }

        const stateScores = this.getStateScoreForAnswer(toClone.pk);
        for(let i = 0; i < stateScores.length; i++) {
            this.cloneStateScore(stateScores[i], newPk);
        }
    }

    cloneFeedback(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const feedback = {
            "model": "campaign_trail.answer_feedback",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "candidate": toClone.fields.candidate,
                "answer_feedback": toClone.fields.answer_feedback
            }
        }
        this.answer_feedback[newPk] = feedback;
    }

    cloneGlobalScore(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const globalScore = {
            "model": "campaign_trail.answer_score_global",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "candidate": toClone.fields.candidate,
                "affected_candidate": toClone.fields.affected_candidate,
                "global_multiplier": toClone.fields.global_multiplier
            }
        }
        this.answer_score_global[newPk] = globalScore;
    }

    cloneIssueScore(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const issueScore = {
            "model": "campaign_trail.answer_score_issue",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "issue": toClone.fields.issue,
                "issue_score": toClone.fields.issue_score,
                "issue_importance": toClone.fields.issue_importance
            }
        }
        this.answer_score_issue[newPk] = issueScore;
    }

    cloneStateScore(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const stateScore = {
            "model": "campaign_trail.answer_score_state",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "state": toClone.fields.state,
                "candidate": toClone.fields.candidate,
                "affected_candidate": toClone.fields.affected_candidate,
                "state_multiplier": toClone.fields.state_multiplier
            }
        }
        this.answer_score_state[newPk] = stateScore;
    }

    getNewPk() {
        const pk = this.highest_pk + 1
        this.highest_pk = pk
        return pk
    }
        
    getAnswersForQuestion(pk) {
        return Object.values(this.answers).filter(answer => answer.fields.question == pk);
    }
    
    getAdvisorFeedbackForAnswer(pk) {
        return Object.values(this.answer_feedback).filter(feedback => feedback.fields.answer == pk);
    }
    
    getGlobalScoreForAnswer(pk) {
        return Object.values(this.answer_score_global).filter(x => x.fields.answer == pk);
    }
    
    getStateScoreForAnswer(pk) {
        return Object.values(this.answer_score_state).filter(x => x.fields.answer == pk);
    }
    
    getIssueScoreForAnswer(pk) {
        return Object.values(this.answer_score_issue).filter(x => x.fields.answer == pk);
    }
    
    getIssueScoreForState(pk) {
        return Object.values(this.state_issue_scores).filter(x => x.fields.state == pk);
    }

    getStateIssueScoresForIssue(pk) {
        return Object.values(this.state_issue_scores).filter(x => x.fields.issue == pk);
    }
    
    getIssueScoreForCandidate(pk) {
        return Object.values(this.candidate_issue_score).filter(x => x.fields.candidate == pk);
    }
    
    getStateMultiplierForCandidate(pk) {
        return Object.values(this.candidate_state_multiplier).filter(x => x.fields.candidate == pk);
    }
    
    getCandidateIssueScoreForIssue(pk) {
        return Object.values(this.candidate_issue_score).filter(x => x.fields.issue == pk);
    }
    
    getRunningMateIssueScoreForIssue(pk) {
        return Object.values(this.running_mate_issue_score).filter(x => x.fields.issue == pk);
    }
    
    getRunningMateIssueScoreForCandidate(pk) {
        return Object.values(this.running_mate_issue_score).filter(x => x.fields.candidate == pk);
    }
    
    getCandidateStateMultipliersForState(pk) {
        return Object.values(this.candidate_state_multiplier).filter(x => x.fields.state == pk);
    }

    getNicknameForCandidate(pk) {
        if(this.jet_data == null || this.jet_data['nicknames'] == null) {
            return "";
        }

        return this.jet_data.nicknames[pk];
    }

    getAllCyoaEvents() {
        if(this.jet_data.cyoa_enabled == null) {
            this.jet_data.cyoa_enabled = false;
        }

        if(this.jet_data.cyoa_data == null) {
            this.jet_data.cyoa_data = {};
        }

        return Object.values(this.jet_data.cyoa_data);
    }

    getAllEndings() {
        if(this.jet_data.endings_enabled == null) {
            this.jet_data.endings_enabled = false;
        }

        if(this.jet_data.ending_data == null) {
            this.jet_data.ending_data = {};
        }

        return Object.values(this.jet_data.ending_data);
    }

    getFirstStatePK() {
        return Object.values(this.states)[0].pk;
    }

    getFirstCandidatePK() {
        return this.getAllCandidatePKs()[0];
    }

    getFirstIssuePK() {
        return Object.keys(this.issues)[0];
    }

    deleteState(pk) {
        if(!pk in this.states) {
            return;
        }

        var answerScoresToRemove = [];

        for (const xPk in this.answer_score_state) {
            const x = this.answer_score_state[xPk];
            if(x.fields.state == pk) {
                answerScoresToRemove.push(xPk);
            }
        }
        for(let i = 0; i < answerScoresToRemove.length; i++) {
            const xPk = answerScoresToRemove[i];
            delete this.answer_score_state[xPk];
        }

        var stateScoresToRemove = [];
        for (const xPk in this.state_issue_scores) {
            const x = this.state_issue_scores[xPk];
            if(x.fields.state == pk) {
                stateScoresToRemove.push(xPk);
            }
        }
        for(let i = 0; i < stateScoresToRemove.length; i++) {
            const xPk = stateScoresToRemove[i];
            delete this.state_issue_scores[xPk];
        }
        
        var csm = [];
        for (const xPk in this.candidate_state_multiplier) {
            const x = this.candidate_state_multiplier[xPk];
            if(x.fields.state == pk) {
                csm.push(xPk);
            }
        }
        for(let i = 0; i < csm.length; i++) {
            const xPk = csm[i];
            delete this.candidate_state_multiplier[xPk];
        }

        delete this.states[pk];
    }

    getAllCandidatePKs() {
        let cans = new Set();
        const canState = Object.values(this.candidate_state_multiplier);

        for(let i = 0; i < canState.length; i++) {
            cans.add(canState[i].fields.candidate);
        }

        return Array.from(cans);
    }

    getMapForPreview(svg) {
        console.log("getMapForPreview called with SVG length:", svg.length);
        
        if (!svg || typeof svg !== 'string') {
            console.error("Invalid SVG data: not a string");
            return [];
        }
        
        // Create a DOM parser
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
        
        // Query for path elements
        const pathElements = svgDoc.querySelectorAll('path');
        console.log(`Found ${pathElements.length} path elements in SVG`);
        
        let out = [];
        
        for (let i = 0; i < pathElements.length; i++) {
            try {
                const path = pathElements[i];
                let id = path.getAttribute('id') || path.getAttribute('data-id');
                
                if (!id) {
                    console.warn(`Path at index ${i} has no id attribute`);
                    continue;
                }
                
                let d = path.getAttribute('d');
                if (!d) {
                    console.warn(`Path with id ${id} has no d attribute`);
                    continue;
                }
                
                let abbr = id.split(" ")[0].replaceAll("-", "_");
                out.push([abbr, d]);
                
                // Log every 10th state to avoid console spam
                if (i % 10 === 0) {
                    console.log(`Processed state: ${abbr}`);
                }
            } catch (error) {
                console.error(`Error processing path at index ${i}:`, error);
            }
        }
    
        console.log(`Successfully processed ${out.length} states`);
        return out;
    }

    deleteCandidate(pk) {
        const stateMultipliers = Object.keys(this.candidate_state_multiplier);
        const issueScores = Object.keys(this.candidate_issue_score);

        for(let i = 0; i < stateMultipliers.length; i++) {
            const sPk = stateMultipliers[i];
            if(this.candidate_state_multiplier[sPk].fields.candidate == pk) {
                delete this.candidate_state_multiplier[sPk];
            }
        }

        for(let i = 0; i < issueScores.length; i++) {
            const iPk = issueScores[i];
            if(this.candidate_issue_score[iPk].fields.candidate == pk) {
                delete this.candidate_issue_score[iPk];
            }
        }
    }

    getPVForState(pk) {
        try {
            return getCurrentVoteResults(this).filter((x) => x.state == pk)[0].result.map(
                (x) => {
                    let nickname = this.getNicknameForCandidate(x.candidate);
                    let canName = nickname != '' && nickname != null ? nickname : x.candidate;
                    return `${canName} - ${(x.percent * 100).toFixed(2)}% (${x.votes} votes)`;
                }
            );
        }
        catch(e) {
            console.error("Pv error:", e);
            return ["Error calculating PV, see console"];
        }
    }

    addStateMultipliersForCandidate(candidatePk) {
        const s = Object.keys(this.states);
        for(let i = 0; i < s.length; i++) {
            const cPk = this.getNewPk();
            // Create candidate state multipliers
            let c = {
                "model": "campaign_trail.candidate_state_multiplier",
                "pk": cPk,
                "fields": {
                    "candidate": candidatePk,
                    "state": s[i],
                    "state_multiplier": 1
                }
            }
            this.candidate_state_multiplier[cPk] = c;
        }
    }

    addCandidate() {
        const candidatePk = this.getNewPk();

        const s = Object.keys(this.states);
        const issues = Object.keys(this.issues);

        this.addStateMultipliersForCandidate(candidatePk);

        for(let i = 0; i < issues.length; i++) {
            const iPk = this.getNewPk();
            // Create state issue scores
            let iss =  {
                "model": "campaign_trail.candidate_issue_score",
                "pk": iPk,
                "fields": {
                    "candidate": candidatePk,
                    "issue": issues[i],
                    "issue_score": 0
                }
            }
            this.candidate_issue_score[iPk] = iss;
        }

        return candidatePk;
    }

    createNewState() {
        const cans = this.getAllCandidatePKs();
        const issues = Object.keys(this.issues);

        const newPk = this.getNewPk();
        let x = {
            "model": "campaign_trail.state",
            "pk": newPk,
            "fields": {
                "name": "New State",
                "abbr": "NST",
                "electoral_votes": 1,
                "popular_votes": 10,
                "poll_closing_time": 120,
                "winner_take_all_flg": 1,
                "election": -1,
            }
        }
        this.states[newPk] = x;
        
        for(let i = 0; i < cans.length; i++) {
            const cPk = this.getNewPk();
            // Create candidate state multipliers
            let c = {
                "model": "campaign_trail.candidate_state_multiplier",
                "pk": cPk,
                "fields": {
                    "candidate": cans[i],
                    "state": newPk,
                    "state_multiplier": 1
                }
            }
            this.candidate_state_multiplier[cPk] = c;
        }

        for(let i = 0; i < issues.length; i++) {
            const iPk = this.getNewPk();
            // Create state issue scores
            let iss = {
                "model": "campaign_trail.state_issue_score",
                "pk": iPk,
                "fields": {
                    "state": newPk,
                    "issue": issues[i],
                    "state_issue_score": 0,
                    "weight": 1.5
                }
            }
            this.state_issue_scores[iPk] = iss;
        }

        return newPk;
    }

    loadMap() {

        const cans = this.getAllCandidatePKs();
        const issues = Object.keys(this.issues);

        const existingStateKeys = Object.keys(this.states);
        existingStateKeys.forEach((x) => this.deleteState(x));

        const svg = this.jet_data.mapping_data.mapSvg;

        const pathsRegex = /<path((.|\n)*?)(\/|<\/path)>/g;
        const idRegex = / id[ \t]*=[ \t]*"(.*)"/g;
        const dRegex = / d[ \t]*=[ \t]*"(.*)"/g;

        const paths = [...svg.match(pathsRegex)];

        const electionPk = this.jet_data.mapping_data.electionPk ?? -1;

        for(let i = 0; i < paths.length; i++) {
            const path = paths[i];

            let id = path.match(idRegex)[0].split("\"")[1].replace("\"", "");
            let d = path.match(dRegex)[0].split("\"")[1].replace("\"", "");
            let abbr = id.split(" ")[0].replaceAll("-", "_");

            const newPk = this.getNewPk();
            let x = {
                "model": "campaign_trail.state",
                "pk": newPk,
                "fields": {
                    "name": id,
                    "abbr": abbr,
                    "electoral_votes": 1,
                    "popular_votes": 10,
                    "poll_closing_time": 120,
                    "winner_take_all_flg": 1,
                    "election": electionPk,
                },
                "d": d
            }
            this.states[newPk] = x;
            this.states[newPk].d = d;
            
            for(let i = 0; i < cans.length; i++) {
                const cPk = this.getNewPk();
                // Create candidate state multipliers
                let c = {
                    "model": "campaign_trail.candidate_state_multiplier",
                    "pk": cPk,
                    "fields": {
                        "candidate": cans[i],
                        "state": newPk,
                        "state_multiplier": 1
                    }
                }
                this.candidate_state_multiplier[cPk] = c;
            }

            for(let i = 0; i < issues.length; i++) {
                const iPk = this.getNewPk();
                // Create state issue scores
                let iss = {
                    "model": "campaign_trail.state_issue_score",
                    "pk": iPk,
                    "fields": {
                        "state": newPk,
                        "issue": issues[i],
                        "state_issue_score": 0,
                        "weight": 1.5
                    }
                }
                this.state_issue_scores[iPk] = iss;
            }
            
        }

    }

    getMapCode() {
        const viewboxCode = false ? "this.paper.setViewBox(0,0,c,u,false);" : `this.paper.setViewBox(${this.jet_data.mapping_data.dx}, ${this.jet_data.mapping_data.dy}, ${this.jet_data.mapping_data.x}, ${this.jet_data.mapping_data.y}, false);`;
        return `(function(e,t,n,r,i){function s(e,t,n,r){r=r instanceof Array?r:[];var i={};for(var s=0;s<r.length;s++){i[r[s]]=true}var o=function(e){this.element=e};o.prototype=n;e.fn[t]=function(){var n=arguments;var r=this;this.each(function(){var s=e(this);var u=s.data("plugin-"+t);if(!u){u=new o(s);s.data("plugin-"+t,u);if(u._init){u._init.apply(u,n)}}else if(typeof n[0]=="string"&&n[0].charAt(0)!="_"&&typeof u[n[0]]=="function"){var a=Array.prototype.slice.call(n,1);var f=u[n[0]].apply(u,a);if(n[0]in i){r=f}}});return r}}var o=370,u=215,a=10;var f={stateStyles:{fill:"#333",stroke:"#666","stroke-width":1,"stroke-linejoin":"round",scale:[1,1]},stateHoverStyles:{fill:"#33c",stroke:"#000",scale:[1.1,1.1]},stateHoverAnimation:500,stateSpecificStyles:{},stateSpecificHoverStyles:{},click:null,mouseover:null,mouseout:null,clickState:{},mouseoverState:{},mouseoutState:{},showLabels:true,labelWidth:20,labelHeight:15,labelGap:6,labelRadius:3,labelBackingStyles:{fill:"#333",stroke:"#666","stroke-width":1,"stroke-linejoin":"round",scale:[1,1]},labelBackingHoverStyles:{fill:"#33c",stroke:"#000"},stateSpecificLabelBackingStyles:{},stateSpecificLabelBackingHoverStyles:{},labelTextStyles:{fill:"#fff",stroke:"none","font-weight":300,"stroke-width":0,"font-size":"10px"},labelTextHoverStyles:{},stateSpecificLabelTextStyles:{},stateSpecificLabelTextHoverStyles:{}};var l={_init:function(t){this.options={};e.extend(this.options,f,t);var n=this.element.width();var i=this.element.height();var s=this.element.width()/o;var l=this.element.height()/u;this.scale=Math.min(s,l);this.labelAreaWidth=Math.ceil(a/this.scale);var c=o+Math.max(0,this.labelAreaWidth-a);this.paper=r(this.element.get(0),c,u);this.paper.setSize(n,i);${viewboxCode}this.stateHitAreas={};this.stateShapes={};this.topShape=null;this._initCreateStates();this.labelShapes={};this.labelTexts={};this.labelHitAreas={};if(this.options.showLabels){this._initCreateLabels()}},_initCreateStates:function(){var t=this.options.stateStyles;var n=this.paper;var r={${this.getStateJavascriptForMapping()}};var i={};for(var s in r){i={};if(this.options.stateSpecificStyles[s]){e.extend(i,t,this.options.stateSpecificStyles[s])}else{i=t}this.stateShapes[s]=n.path(r[s]).attr(i);this.topShape=this.stateShapes[s];this.stateHitAreas[s]=n.path(r[s]).attr({fill:"#000","stroke-width":0,opacity:0,cursor:"pointer"});this.stateHitAreas[s].node.dataState=s}this._onClickProxy=e.proxy(this,"_onClick");this._onMouseOverProxy=e.proxy(this,"_onMouseOver"),this._onMouseOutProxy=e.proxy(this,"_onMouseOut");for(var s in this.stateHitAreas){this.stateHitAreas[s].toFront();e(this.stateHitAreas[s].node).bind("mouseout",this._onMouseOutProxy);e(this.stateHitAreas[s].node).bind("click",this._onClickProxy);e(this.stateHitAreas[s].node).bind("mouseover",this._onMouseOverProxy)}},_initCreateLabels:function(){var t=this.paper;var n=[];var r=860;var i=220;var s=this.options.labelWidth;var o=this.options.labelHeight;var u=this.options.labelGap;var a=this.options.labelRadius;var f=s/this.scale;var l=o/this.scale;var c=(s+u)/this.scale;var h=(o+u)/this.scale*.5;var p=a/this.scale;var d=this.options.labelBackingStyles;var v=this.options.labelTextStyles;var m={};for(var g=0,y,b,w;g<n.length;++g){w=n[g];y=(g+1)%2*c+r;b=g*h+i;m={};if(this.options.stateSpecificLabelBackingStyles[w]){e.extend(m,d,this.options.stateSpecificLabelBackingStyles[w])}else{m=d}this.labelShapes[w]=t.rect(y,b,f,l,p).attr(m);m={};if(this.options.stateSpecificLabelTextStyles[w]){e.extend(m,v,this.options.stateSpecificLabelTextStyles[w])}else{e.extend(m,v)}if(m["font-size"]){m["font-size"]=parseInt(m["font-size"])/this.scale+"px"}this.labelTexts[w]=t.text(y+f/2,b+l/2,w).attr(m);this.labelHitAreas[w]=t.rect(y,b,f,l,p).attr({fill:"#000","stroke-width":0,opacity:0,cursor:"pointer"});this.labelHitAreas[w].node.dataState=w}for(var w in this.labelHitAreas){this.labelHitAreas[w].toFront();e(this.labelHitAreas[w].node).bind("mouseout",this._onMouseOutProxy);e(this.labelHitAreas[w].node).bind("click",this._onClickProxy);e(this.labelHitAreas[w].node).bind("mouseover",this._onMouseOverProxy)}},_getStateFromEvent:function(e){var t=e.target&&e.target.dataState||e.dataState;return this._getState(t)},_getState:function(e){var t=this.stateShapes[e];var n=this.stateHitAreas[e];var r=this.labelShapes[e];var i=this.labelTexts[e];var s=this.labelHitAreas[e];return{shape:t,hitArea:n,name:e,labelBacking:r,labelText:i,labelHitArea:s}},_onMouseOut:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("mouseout",e,t)},_defaultMouseOutAction:function(t){var n={};if(this.options.stateSpecificStyles[t.name]){e.extend(n,this.options.stateStyles,this.options.stateSpecificStyles[t.name])}else{n=this.options.stateStyles}t.shape.animate(n,this.options.stateHoverAnimation);if(t.labelBacking){var n={};if(this.options.stateSpecificLabelBackingStyles[t.name]){e.extend(n,this.options.labelBackingStyles,this.options.stateSpecificLabelBackingStyles[t.name])}else{n=this.options.labelBackingStyles}t.labelBacking.animate(n,this.options.stateHoverAnimation)}},_onClick:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("click",e,t)},_onMouseOver:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("mouseover",e,t)},_defaultMouseOverAction:function(t){this.bringShapeToFront(t.shape);this.paper.safari();var n={};if(this.options.stateSpecificHoverStyles[t.name]){e.extend(n,this.options.stateHoverStyles,this.options.stateSpecificHoverStyles[t.name])}else{n=this.options.stateHoverStyles}t.shape.animate(n,this.options.stateHoverAnimation);if(t.labelBacking){var n={};if(this.options.stateSpecificLabelBackingHoverStyles[t.name]){e.extend(n,this.options.labelBackingHoverStyles,this.options.stateSpecificLabelBackingHoverStyles[t.name])}else{n=this.options.labelBackingHoverStyles}t.labelBacking.animate(n,this.options.stateHoverAnimation)}},_triggerEvent:function(t,n,r){var i=r.name;var s=false;var o=e.Event("usmap"+t+i);o.originalEvent=n;if(this.options[t+"State"][i]){s=this.options[t+"State"][i](o,r)===false}if(o.isPropagationStopped()){this.element.trigger(o,[r]);s=s||o.isDefaultPrevented()}if(!o.isPropagationStopped()){var u=e.Event("usmap"+t);u.originalEvent=n;if(this.options[t]){s=this.options[t](u,r)===false||s}if(!u.isPropagationStopped()){this.element.trigger(u,[r]);s=s||u.isDefaultPrevented()}}if(!s){switch(t){case"mouseover":this._defaultMouseOverAction(r);break;case"mouseout":this._defaultMouseOutAction(r);break}}return!s},trigger:function(e,t,n){t=t.replace("usmap","");e=e.toUpperCase();var r=this._getState(e);this._triggerEvent(t,n,r)},bringShapeToFront:function(e){if(this.topShape){e.insertAfter(this.topShape)}this.topShape=e}};var c=[];s(e,"usmap",l,c)})(jQuery,document,window,Raphael)`
    }

    getStateJavascriptForMapping() {
        let f = "";
        const states = Object.values(this.states);

        for(let i = 0; i < states.length; i++) {
            f += `${states[i].fields.abbr}:"${states[i].d}"`
            if(i < states.length - 1) {
                f += ", ";
            }
        }

        return f
    }

    exportCode2() {

        let f = "";

        if(this.jet_data.mapping_enabled) {
            f += "\n// Generated mapping code\n" + this.getMapCode();
            this.jet_data.mapping_data.mapSvg = '';
            f += "\n\n";
        }

        f += this.getCYOACode();

        f += ("campaignTrail_temp.questions_json = ")
        let x = JSON.stringify(Array.from(this.questions.values()), null, 4).replaceAll("â€™", "\'")
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.answers_json = ")
        x = JSON.stringify(Object.values(this.answers), null, 4).replaceAll("â€™", "\'")
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.states_json = ")
        x = JSON.stringify(Object.values(this.states), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.issues_json = ")
        x = JSON.stringify(Object.values(this.issues), null, 4).replaceAll("â€™", "\'")
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.state_issue_score_json = ")
        x = JSON.stringify(Object.values(this.state_issue_scores), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.candidate_issue_score_json = ")
        x = JSON.stringify(Object.values(this.candidate_issue_score), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.running_mate_issue_score_json = ")
        x = JSON.stringify(Object.values(this.running_mate_issue_score), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.candidate_state_multiplier_json = ")
        x = JSON.stringify(Object.values(this.candidate_state_multiplier), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.answer_score_global_json = ")
        x = JSON.stringify(Object.values(this.answer_score_global), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.answer_score_issue_json = ")
        x = JSON.stringify(Object.values(this.answer_score_issue), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.answer_score_state_json = ")
        x = JSON.stringify(Object.values(this.answer_score_state), null, 4)
        f += (x)
        f += ("\n\n")

        f += ("campaignTrail_temp.answer_feedback_json = ")
        x = JSON.stringify(Object.values(this.answer_feedback), null, 4)
        f += (x)
        f += ("\n\n")

        const code = this.jet_data.code_to_add;
        delete this.jet_data.code_to_add;

        if(this.jet_data.banner_enabled) {
            f += `campaignTrail_temp.candidate_image_url = "${this.jet_data.banner_data.canImage}";\n`;
            f += `campaignTrail_temp.running_mate_image_url = "${this.jet_data.banner_data.runImage}";\n`;
            f += `campaignTrail_temp.candidate_last_name = "${this.jet_data.banner_data.canName}";\n`;
            f += `campaignTrail_temp.running_mate_last_name = "${this.jet_data.banner_data.runName}";\n\n`;
        }

        f += this.getEndingCode();

        if(code) {
            f += "//#startcode";
            f += code;
            f += "//#endcode"
        }

        f += ("\n\ncampaignTrail_temp.jet_data = [")
        x = JSON.stringify(this.jet_data, null, 4)

        this.jet_data.code_to_add = code;
        
        f += (x)
        f += "\n]"
        f += ("\n\n")
        
        return f
    }

    getEndingCode() {
        if(this.jet_data.ending_data == null || !this.jet_data.endings_enabled) {
            return "";
        }

        var f = "campaignTrail_temp.multiple_endings = true;\nendingPicker = (out, totv, aa, quickstats) => {\n";

        const endings = this.getAllEndings();

        f += 
`
    function setImage(url) {
        if(url == '' || url == null) return;
        let interval = setInterval(function () {
            img = document.getElementsByClassName("person_image")[0];
            if (img != null) {
                img.src = url;
                clearInterval(interval);
            }
        }, 50);
    }
`

        for(let i = 0; i < endings.length; i++) {
            const ending = endings[i];

            f += 
`
    if(quickstats[${ending.variable}] ${ending.operator} ${ending.amount}) {
        setImage("${ending.endingImage}");
        return \`${ending.endingText}\`;
    }`;
        }

        f += "\n}\n";

        return f;
    }

    getCYOACode() {
        var f = "";
        if(this.jet_data.cyoa_data != null && this.jet_data.cyoa_enabled) {
            f += `
campaignTrail_temp.cyoa = true;

function getQuestionNumberFromPk(pk) {
    return campaignTrail_temp.questions_json.map(q=>q.pk).indexOf(pk)-1;
}

cyoAdventure = function (a) {
    ans = campaignTrail_temp.player_answers[campaignTrail_temp.player_answers.length-1];\n`

            let events = Object.values(this.jet_data.cyoa_data);

            for (let i = 0; i < events.length; i++) {
                f += `
    ${i > 0 ? "else " : ""}if (ans == ${events[i].answer}) {
        campaignTrail_temp.question_number = getQuestionNumberFromPk(${events[i].question});
    }`
            }

            if(events.length > 0) {
                f += 
    `\n    else {
        return false;
    }`
            }

            f += "\n}\n\n"
        }
        return f;
    }
}

function extractJSON(raw_file, start, end, backup = null, backupEnd = null, required = true, fallback = []) {
    let f = raw_file
    if(!f.includes(start)) {
        if(backup != null) {
            console.log(`Start [${start}] not in file provided, trying backup ${backup}`)
            return extractJSON(f, backup, backupEnd == null ? end : backupEnd, null, null, required)
        }

        console.log(`ERROR: Start [${start}] not in file provided, returning none`)
            
        if(required) {
            alert(`WARNING: Your uploaded code 2 is missing the section '${start}'. Skipping it, but the editor may be missing some features because the section is missing. Please check your base scenario.`)
        }
        
        return fallback
    }
    else if(start.includes("JSON.parse")) {
        f = f.replaceAll('\\"', '"')
        f = f.replaceAll("\\'", "'")
        f = f.replaceAll("\\\\", "\\")
    }

    let startString = f.trim().split(start)[1];
    const possibleEndings = getAllIndexes(startString, end);
    let foundValidJSON = false;

    for(let i = 0; i < possibleEndings.length; i++) {
        let raw = startString.slice(0, possibleEndings[i])

        if(raw[0] == '"' || raw[0] == "'") {
            raw = raw.substring(1)
        }
            
        if(raw.slice(-1) == '"' || raw.slice(-1) == "'") {
            raw = raw.substring(0, raw.length-1)
        }
            
        try {
            if( end == "]")
                raw = "[" + raw + "]"
            res = JSON.parse(raw)
            foundValidJSON = true;
            console.log("Found valid ending for " + start + "!");
            break;
        }
        catch(e) {
            console.log(`Error while parsing JSON for ${start}: ${e} going to try next ending instead`)
        }
    }

    if(!foundValidJSON) {
        console.log(`Error: Could not find a valid JSON for start ${start}`)
        return fallback;
    }

    console.log(`found ${start}!`)

    return res
}

function extractCode(raw_json) {
    let code = raw_json.split("//#startcode")[1]?.split("//#endcode")[0];
    return code;
}

function loadDataFromFile(raw_json) {

    let highest_pk = -1

    let questions = new Map();
    let answers = {}
    let states = {}
    let feedbacks = {}

    let answer_score_globals = {}
    let answer_score_issues = {}
    let answer_score_states = {}
    
    let state_issue_scores = {}

    let candidate_issue_scores = {}
    let candidate_state_multipliers = {}
    let running_mate_issue_scores = {}

    let issues = {}

    let jet_data = {}

    const code = extractCode(raw_json);

    var duplicates = false;

    raw_json = raw_json.replaceAll("\n", "");
    raw_json = raw_json.replaceAll("\r", "");
    raw_json = raw_json.replaceAll(/ +/g, " ");

    states_json = extractJSON(raw_json, "campaignTrail_temp.states_json = JSON.parse(", ");", "campaignTrail_temp.states_json = [", "]")
    states_json.forEach(state => {

        if(state["pk"] in states) {
            console.log(`WARNING: Found duplicate pk ${state["pk"]} in states already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, state["pk"])
        states[state["pk"]] = state
    });
       
    questions_json = extractJSON(raw_json, "campaignTrail_temp.questions_json = JSON.parse(", ");", "campaignTrail_temp.questions_json = [", "]");
    questions_json.forEach(question => {

        if(question["pk"] in questions) {
            console.log(`WARNING: Found duplicate pk ${question["pk"]} in questions already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, question["pk"]);

        if(question.fields.description) {
            question['fields']['description'] = question['fields']['description'].replaceAll("â€™", "'").replaceAll("â€”", "—");
        }
        
        questions.set(question.pk, question);
    });

    answers_json = extractJSON(raw_json, "campaignTrail_temp.answers_json = JSON.parse(", ");", "campaignTrail_temp.answers_json = [", "]");
    answers_json.forEach(answer => {

        if(answer["pk"] in answers) {
            console.log(`WARNING: Found duplicate pk ${answer["pk"]} in answers already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, answer["pk"]);

        if(answer.fields.description) {
            answer['fields']['description'] = answer['fields']['description'].replaceAll("â€™", "'").replaceAll("â€”", "—");
        }
        
        key = answer["pk"];
        answers[key] = answer;
    });

    answer_feedbacks_json = extractJSON(raw_json, "campaignTrail_temp.answer_feedback_json = JSON.parse(", ");", "campaignTrail_temp.answer_feedback_json = [", "]");
    answer_feedbacks_json.forEach(feedback => {

        if(feedback["pk"] in feedbacks) {
            console.log(`WARNING: Found duplicate pk ${feedback["pk"]} in feedbacks already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, feedback["pk"]);

        if(feedback.fields.answer_feedback) {
            feedback['fields']['answer_feedback'] = feedback['fields']['answer_feedback'].replaceAll("â€™", "'").replaceAll("â€”", "—");
        }
        
        key = feedback['pk'];
        feedbacks[key] = feedback;
    });

    answer_score_globals_json = extractJSON(raw_json, "campaignTrail_temp.answer_score_global_json = JSON.parse(", ");", "campaignTrail_temp.answer_score_global_json = [", "]");
    answer_score_globals_json.forEach(x => {

        if(x["pk"] in answer_score_globals) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in answer_score_globals already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }


        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        answer_score_globals[key] = x;
    });

    answer_score_issues_json = extractJSON(raw_json, "campaignTrail_temp.answer_score_issue_json = JSON.parse(", ");", "campaignTrail_temp.answer_score_issue_json = [", "]");
    answer_score_issues_json.forEach(x => {

        if(x["pk"] in answer_score_issues) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in answer_score_issues already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        answer_score_issues[key] = x;
    });

    answer_score_states_json = extractJSON(raw_json, "campaignTrail_temp.answer_score_state_json = JSON.parse(", ");", "campaignTrail_temp.answer_score_state_json = [", "]");
    answer_score_states_json.forEach(x => {

        if(x["pk"] in answer_score_states) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in answer_score_states already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        answer_score_states[key] = x;
    });

    candidate_issue_scores_json = extractJSON(raw_json, "campaignTrail_temp.candidate_issue_score_json = JSON.parse(", ");", "campaignTrail_temp.candidate_issue_score_json = [", "]");
    candidate_issue_scores_json.forEach(x => {

        if(x["pk"] in candidate_issue_scores) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in candidate_issue_scores already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        candidate_issue_scores[key] = x;
    });

    candidate_state_multipliers_json = extractJSON(raw_json, "campaignTrail_temp.candidate_state_multiplier_json = JSON.parse(", ");", "campaignTrail_temp.candidate_state_multiplier_json = [", "]");
    candidate_state_multipliers_json.forEach(x => {

        if(x["pk"] in candidate_state_multipliers) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in candidate_state_multipliers already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        candidate_state_multipliers[key] = x;
    });

    running_mate_issue_scores_json = extractJSON(raw_json, "campaignTrail_temp.running_mate_issue_score_json = JSON.parse(", ");", "campaignTrail_temp.running_mate_issue_score_json = [", "]");
    running_mate_issue_scores_json.forEach(x => {

        if(x["pk"] in running_mate_issue_scores) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in running_mate_issue_scores already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        running_mate_issue_scores[key] = x;
    });

    state_issue_scores_json = extractJSON(raw_json, "campaignTrail_temp.state_issue_score_json = JSON.parse(", ");", "campaignTrail_temp.state_issue_score_json = [", "]");
    state_issue_scores_json.forEach(x => {

        if(x["pk"] in state_issue_scores) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in state_issue_scores already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        state_issue_scores[key] = x;
    });

    issues_json = extractJSON(raw_json, "campaignTrail_temp.issues_json = JSON.parse(", ");", "campaignTrail_temp.issues_json = [", "]");
    issues_json.forEach(x => {

        if(x["pk"] in issues) {
            console.log(`WARNING: Found duplicate pk ${x["pk"]} in issues already, make sure there are no duplicate PKs in your file before importing`)
            duplicates = true;
        }

        highest_pk = Math.max(highest_pk, x["pk"]);
        key = x['pk'];
        issues[key] = x;
    });

    if(duplicates) alert("WARNING: Duplicate PKs found during import process, see console for more details. Some features may not work as expected or data may be missing.")

    jet_data = extractJSON(raw_json, "campaignTrail_temp.jet_data = [", "]", null, null, false, [{}])[0];

    jet_data.code_to_add = code;

    data = new TCTData(questions, answers, issues, state_issue_scores, candidate_issue_scores, running_mate_issue_scores, candidate_state_multipliers, answer_score_globals, answer_score_issues, answer_score_states, feedbacks, states, highest_pk, jet_data)

    return data
}

// https://stackoverflow.com/questions/20798477/how-to-find-the-indexes-of-all-occurrences-of-an-element-in-array#:~:text=The%20.,val%2C%20i%2B1))%20!%3D
function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}