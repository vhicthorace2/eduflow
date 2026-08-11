import { generateAssessment } from "../agents/assessmentAgent.js";

export async function startAssessment(req, res){

    const questions = await generateAssessment(req.body.course);

    res.json(questions);

}