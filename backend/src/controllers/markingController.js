const MarkingModel = require('../models/markingModel.js');

class MarkingController {
    constructor() {
        this.markingModel = new MarkingModel();
    }

    createMarkingComponent = async (req, res) => {
        try {
            const marking = await this.markingModel.createMarkingComponent(req.body);
            res.status(201).json(marking);
        } catch (error) {
            console.error("Create Marking error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllMarkingComponents = async (req, res) => {
        try {
            const markings = await this.markingModel.getAllMarkingComponents();
            res.status(200).json(markings);
        } catch (error) {
            console.error("Get All Markings error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getMarkingComponentById = async (req, res) => {
        try {
            const marking = await this.markingModel.getMarkingComponentById(req.params.id);
            if (!marking) {
                return res.status(404).json({ message: "Marking Component not found" });
            }
            res.status(200).json(marking);
        } catch (error) {
            console.error("Get Marking By Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateMarkingComponent = async (req, res) => {
        try {
            const marking = await this.markingModel.updateMarkingComponent(req.params.id, req.body);
            if (!marking) {
                return res.status(404).json({ message: "Marking Component not found" });
            }
            res.status(200).json(marking);
        } catch (error) {
            console.error("Update Marking error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    deleteMarkingComponent = async (req, res) => {
        try {
            const marking = await this.markingModel.deleteMarkingComponent(req.params.id);
            if (!marking) {
                return res.status(404).json({ message: "Marking Component not found" });
            }
            res.status(200).json({ message: "Marking Component deleted successfully" });
        } catch (error) {
             console.error("Delete Marking error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = MarkingController;
