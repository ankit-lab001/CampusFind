const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

const PORT = 5000;

app.use(cors());
app.use(express.json());


// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "CampusFind API is running 🚀"
    });
});


// ========================================
// TEST API
// ========================================

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "CampusFind backend is working!"
    });
});


// ========================================
// DATABASE TEST
// ========================================

app.get("/api/db-test", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT NOW()"
        );

        res.json({
            success: true,
            message: "Database connected successfully!",
            time: result.rows[0].now
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed.",
            error: error.message
        });

    }

});


// ========================================
// GET ALL ITEMS
// ========================================

app.get("/api/items", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM items
            ORDER BY created_at DESC
            `
        );

        res.json(result.rows);

    } catch (error) {

        console.error(
            "Get items error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load items.",
            error: error.message
        });

    }

});


// ========================================
// GET SINGLE ITEM
// ========================================

app.get("/api/items/:id", async (req, res) => {

    const { id } = req.params;

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM items
            WHERE id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Item not found."
            });

        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Get single item error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load item.",
            error: error.message
        });

    }

});


// ========================================
// CREATE ITEM / REPORT
// ========================================

app.post("/api/items", async (req, res) => {

    const {
        type,
        title,
        category,
        description,
        color,
        brand,
        location,
        item_date,
        image_url,
        reporter_name,
        reporter_phone,
        reporter_department
    } = req.body;


    // ----------------------------------------
    // VALIDATION
    // ----------------------------------------

    if (!type) {

        return res.status(400).json({
            success: false,
            message: "Report type is required."
        });

    }


    if (
        type !== "LOST" &&
        type !== "FOUND"
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Type must be LOST or FOUND."
        });

    }


    if (!title || !title.trim()) {

        return res.status(400).json({
            success: false,
            message: "Item title is required."
        });

    }


    if (
        !reporter_name ||
        !reporter_name.trim()
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Reporter name is required."
        });

    }


    if (
        !reporter_phone ||
        !/^[0-9]{10}$/.test(
            reporter_phone
        )
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Valid 10-digit phone number is required."
        });

    }


    if (
        !reporter_department ||
        !reporter_department.trim()
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Reporter department is required."
        });

    }


    try {

        const result = await pool.query(
            `
            INSERT INTO items (
                type,
                title,
                category,
                description,
                color,
                brand,
                location,
                item_date,
                image_url,
                status,
                reporter_name,
                reporter_phone,
                reporter_department
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                'ACTIVE',
                $10,
                $11,
                $12
            )
            RETURNING *
            `,
            [
                type,
                title.trim(),
                category || null,
                description || null,
                color || null,
                brand || null,
                location || null,
                item_date || null,
                image_url || null,
                reporter_name.trim(),
                reporter_phone,
                reporter_department.trim()
            ]
        );


        res.status(201).json({
            success: true,
            message:
                "Item reported successfully.",
            item: result.rows[0]
        });


    } catch (error) {

        console.error(
            "Create item error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to create report.",
            error: error.message
        });

    }

});


// ========================================
// UPDATE ITEM STATUS
// ========================================

app.patch(
    "/api/items/:id/status",
    async (req, res) => {

        const { id } = req.params;
        const { status } = req.body;


        if (
            !status ||
            ![
                "ACTIVE",
                "CLOSED"
            ].includes(status)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Status must be ACTIVE or CLOSED."
            });

        }


        try {

            const result = await pool.query(
                `
                UPDATE items
                SET status = $1
                WHERE id = $2
                RETURNING *
                `,
                [
                    status,
                    id
                ]
            );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Report not found."
                });

            }


            res.json({
                success: true,
                message:
                    `Report marked as ${status}.`,
                item: result.rows[0]
            });


        } catch (error) {

            console.error(
                "Update status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update report status.",
                error: error.message
            });

        }

    }
);


// ========================================
// DELETE ITEM / REPORT
// ========================================

app.delete(
    "/api/items/:id",
    async (req, res) => {

        const { id } = req.params;


        try {

            // --------------------------------
            // DELETE RELATED MATCHES
            // --------------------------------

            await pool.query(
                `
                DELETE FROM matches
                WHERE lost_item_id = $1
                OR found_item_id = $1
                `,
                [id]
            );


            // --------------------------------
            // DELETE RELATED CLAIMS
            // --------------------------------

            await pool.query(
                `
                DELETE FROM claims
                WHERE item_id = $1
                `,
                [id]
            );


            // --------------------------------
            // DELETE ITEM
            // --------------------------------

            const result =
                await pool.query(
                    `
                    DELETE FROM items
                    WHERE id = $1
                    RETURNING *
                    `,
                    [id]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Report not found."
                });

            }


            res.json({
                success: true,
                message:
                    "Report deleted successfully.",
                item: result.rows[0]
            });


        } catch (error) {

            console.error(
                "Delete report error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Failed to delete report.",
                error: error.message
            });

        }

    }
);


// ========================================
// SMART MATCHING FUNCTIONS
// ========================================

function normalizeText(value) {

    if (!value) {
        return "";
    }

    return value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");

}


// ========================================
// WORD SIMILARITY
// ========================================

function getWordSimilarity(
    text1,
    text2
) {

    const first =
        normalizeText(text1);

    const second =
        normalizeText(text2);


    if (!first || !second) {
        return 0;
    }


    if (first === second) {
        return 1;
    }


    const words1 =
        new Set(
            first.split(/\s+/)
        );


    const words2 =
        new Set(
            second.split(/\s+/)
        );


    let commonWords = 0;


    words1.forEach(
        (word) => {

            if (
                words2.has(word)
            ) {
                commonWords++;
            }

        }
    );


    const totalUniqueWords =
        new Set([
            ...words1,
            ...words2
        ]).size;


    if (
        totalUniqueWords === 0
    ) {
        return 0;
    }


    return (
        commonWords /
        totalUniqueWords
    );

}


// ========================================
// DATE SCORE
// ========================================

function getDateScore(
    date1,
    date2
) {

    if (!date1 || !date2) {
        return 0;
    }


    const firstDate =
        new Date(date1);

    const secondDate =
        new Date(date2);


    if (
        isNaN(firstDate.getTime()) ||
        isNaN(secondDate.getTime())
    ) {

        return 0;

    }


    const difference =
        Math.abs(
            firstDate.getTime() -
            secondDate.getTime()
        ) /
        (
            1000 *
            60 *
            60 *
            24
        );


    if (difference === 0) {
        return 5;
    }


    if (difference <= 1) {
        return 4;
    }


    if (difference <= 3) {
        return 2;
    }


    return 0;

}


// ========================================
// CALCULATE MATCH SCORE
// ========================================

function calculateMatchScore(
    lostItem,
    foundItem
) {

    let score = 0;

    const matchedFields = [];


    // CATEGORY
    if (
        normalizeText(
            lostItem.category
        ) &&
        normalizeText(
            lostItem.category
        ) ===
        normalizeText(
            foundItem.category
        )
    ) {

        score += 20;

        matchedFields.push(
            "Category"
        );

    }


    // BRAND
    if (
        normalizeText(
            lostItem.brand
        ) &&
        normalizeText(
            lostItem.brand
        ) ===
        normalizeText(
            foundItem.brand
        )
    ) {

        score += 15;

        matchedFields.push(
            "Brand"
        );

    }


    // LOCATION
    if (
        normalizeText(
            lostItem.location
        ) &&
        normalizeText(
            lostItem.location
        ) ===
        normalizeText(
            foundItem.location
        )
    ) {

        score += 15;

        matchedFields.push(
            "Location"
        );

    }


    // COLOR
    if (
        normalizeText(
            lostItem.color
        ) &&
        normalizeText(
            lostItem.color
        ) ===
        normalizeText(
            foundItem.color
        )
    ) {

        score += 10;

        matchedFields.push(
            "Color"
        );

    }


    // TITLE
    const titleSimilarity =
        getWordSimilarity(
            lostItem.title,
            foundItem.title
        );


    const titlePoints =
        Math.round(
            titleSimilarity * 25
        );


    score += titlePoints;


    if (
        titleSimilarity >= 0.5
    ) {

        matchedFields.push(
            "Title"
        );

    }


    // DESCRIPTION
    const descriptionSimilarity =
        getWordSimilarity(
            lostItem.description,
            foundItem.description
        );


    const descriptionPoints =
        Math.round(
            descriptionSimilarity * 10
        );


    score += descriptionPoints;


    if (
        descriptionSimilarity >= 0.3
    ) {

        matchedFields.push(
            "Description"
        );

    }


    // DATE
    const datePoints =
        getDateScore(
            lostItem.item_date,
            foundItem.item_date
        );


    score += datePoints;


    if (
        datePoints >= 4
    ) {

        matchedFields.push(
            "Date"
        );

    }


    return {

        score:
            Math.min(
                score,
                100
            ),

        matchedFields

    };

}


// ========================================
// SMART MATCH API
// ========================================

app.get(
    "/api/items/:id/matches",
    async (req, res) => {

        const { id } = req.params;


        try {

            // --------------------------------
            // GET SELECTED ITEM
            // --------------------------------

            const itemResult =
                await pool.query(
                    `
                    SELECT *
                    FROM items
                    WHERE id = $1
                    `,
                    [id]
                );


            if (
                itemResult.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Item not found."
                });

            }


            const selectedItem =
                itemResult.rows[0];


            // --------------------------------
            // FIND OPPOSITE TYPE
            // --------------------------------

            const oppositeType =
                selectedItem.type === "LOST"
                    ? "FOUND"
                    : "LOST";


            // --------------------------------
            // GET ACTIVE OPPOSITE ITEMS
            // --------------------------------

            const matchResult =
                await pool.query(
                    `
                    SELECT *
                    FROM items
                    WHERE type = $1
                    AND status = 'ACTIVE'
                    AND id != $2
                    ORDER BY created_at DESC
                    `,
                    [
                        oppositeType,
                        id
                    ]
                );


            // --------------------------------
            // CALCULATE MATCHES
            // --------------------------------

            const matches =
                matchResult.rows.map(
                    (candidate) => {

                        const result =
                            selectedItem.type ===
                            "LOST"
                                ? calculateMatchScore(
                                    selectedItem,
                                    candidate
                                )
                                : calculateMatchScore(
                                    candidate,
                                    selectedItem
                                );


                        return {

                            id:
                                candidate.id,

                            type:
                                candidate.type,

                            title:
                                candidate.title,

                            category:
                                candidate.category,

                            description:
                                candidate.description,

                            color:
                                candidate.color,

                            brand:
                                candidate.brand,

                            location:
                                candidate.location,

                            item_date:
                                candidate.item_date,

                            status:
                                candidate.status,

                            image_url:
                                candidate.image_url,

                            match_score:
                                result.score,

                            matched_fields:
                                result.matchedFields

                        };

                    }
                );


            // --------------------------------
            // ONLY STRONG MATCHES
            // --------------------------------

            const filteredMatches =
                matches
                    .filter(
                        (match) =>
                            match.match_score >=
                            15
                    )
                    .sort(
                        (a, b) =>
                            b.match_score -
                            a.match_score
                    );


            res.json({

                success: true,

                item_id:
                    selectedItem.id,

                item_type:
                    selectedItem.type,

                total_matches:
                    filteredMatches.length,

                matches:
                    filteredMatches

            });


        } catch (error) {

            console.error(
                "Smart matching error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Failed to calculate matches.",
                error:
                    error.message
            });

        }

    }
);


// ========================================
// START SERVER
// ========================================

app.listen(
    PORT,
    () => {

        console.log(
            `CampusFind backend running on http://localhost:${PORT}`
        );

    }
);