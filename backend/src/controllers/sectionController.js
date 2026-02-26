const SectionModel = require('../models/sectionModel.js');

class SectionController {
    constructor() {
        this.sectionModel = new SectionModel();
    }

    createSection = async (req, res) => {
        try {
            const section = await this.sectionModel.createSection(req.body);
            res.status(201).json(section);
        } catch (error) {
            console.error("Create Section error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getAllSections = async (req, res) => {
        try {
            const sections = await this.sectionModel.getAllSections();
            res.status(200).json(sections);
        } catch (error) {
            console.error("Get All Sections error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getSectionsByTermId = async (req, res) => {
        try {
            const sections = await this.sectionModel.getSectionsByTermId(req.params.term_id);
            res.status(200).json(sections);
        } catch (error) {
            console.error("Get Sections By Term Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }
    
    deleteSection = async (req, res) => {
        try {
            const { term_id, name } = req.body; 
            if (!term_id || !name) {
                return res.status(400).json({ message: "term_id and name are required" });
            }
            const section = await this.sectionModel.deleteSection(term_id, name);
            if (!section) {
                return res.status(404).json({ message: "Section not found" });
            }
            res.status(200).json({ message: "Section deleted successfully" });
        } catch (error) {
             console.error("Delete Section error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SectionController;
