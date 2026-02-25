const FeedbackModel = require('../models/feedbackModel.js');

class FeedbackController {
    constructor() {
        this.feedbackModel = new FeedbackModel();
    }

    createFeedback = async (req, res) => {
        try {
            const feedback = await this.feedbackModel.createFeedback(req.body);
            res.status(201).json(feedback);
        } catch (error) {
             console.error("Create Feedback error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllFeedback = async (req, res) => {
        try {
            const feedbacks = await this.feedbackModel.getAllFeedback();
            res.status(200).json(feedbacks);
        } catch (error) {
            console.error("Get All Feedback error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getFeedbackById = async (req, res) => {
        try {
            const feedback = await this.feedbackModel.getFeedbackById(req.params.id);
            if (!feedback) {
                return res.status(404).json({ message: "Feedback not found" });
            }
            res.status(200).json(feedback);
        } catch (error) {
             console.error("Get Feedback By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateFeedback = async (req, res) => {
        try {
            const feedback = await this.feedbackModel.updateFeedback(req.params.id, req.body);
            if (!feedback) {
                return res.status(404).json({ message: "Feedback not found" });
            }
            res.status(200).json(feedback);
        } catch (error) {
            console.error("Update Feedback error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteFeedback = async (req, res) => {
        try {
            const feedback = await this.feedbackModel.deleteFeedback(req.params.id);
            if (!feedback) {
                return res.status(404).json({ message: "Feedback not found" });
            }
            res.status(200).json({ message: "Feedback deleted successfully" });
        } catch (error) {
            console.error("Delete Feedback error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = FeedbackController;
