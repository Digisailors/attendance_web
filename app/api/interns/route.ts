// app/api/interns/route.ts - DEBUG VERSION
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use SERVICE ROLE KEY for server-side operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Changed this

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("MISSING SUPABASE CREDENTIALS!");
}

// Service role client bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});


// Helper function to upload file to Supabase Storage
async function uploadFile(
  file: File,
  internId: string,
  fileType: string
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${internId}/${fileType}.${fileExt}`;

  console.log(`Uploading ${fileType} as ${fileName}, size: ${file.size} bytes`);

  const { data, error } = await supabase.storage
    .from("intern-documents")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw new Error(`Failed to upload ${fileType}: ${error.message}`);
  }

  console.log(`Successfully uploaded ${fileType}`);
  return fileName;
}

// POST - Create new intern
export async function POST(request: NextRequest) {
  console.log("\n=== POST /api/interns - START ===");

  try {
    const formData = await request.formData();
    console.log("FormData received, keys:", Array.from(formData.keys()));

    // Extract form fields
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const college = formData.get("college") as string;
    const yearOrPassedOut = formData.get("yearOrPassedOut") as string;
    const department = formData.get("department") as string;
    const domainInOffice = formData.get("domainInOffice") as string;
    const paidOrUnpaid = formData.get("paidOrUnpaid") as string;
    const mentorName = formData.get("mentorName") as string | null;

    console.log("Extracted data:", {
      name,
      email,
      phoneNumber,
      college,
      yearOrPassedOut,
      department,
      domainInOffice,
      paidOrUnpaid,
      mentorName,
    });

    // Extract files
    const aadhar = formData.get("aadhar") as File | null;
    const photo = formData.get("photo") as File | null;
    const marksheet = formData.get("marksheet") as File | null;
    const resume = formData.get("resume") as File | null;

    console.log("Files received:", {
      aadhar: aadhar ? `${aadhar.name} (${aadhar.size} bytes)` : "null",
      photo: photo ? `${photo.name} (${photo.size} bytes)` : "null",
      marksheet: marksheet
        ? `${marksheet.name} (${marksheet.size} bytes)`
        : "null",
      resume: resume ? `${resume.name} (${resume.size} bytes)` : "null",
    });

    // Validate required fields
    if (
      !name ||
      !email ||
      !phoneNumber ||
      !college ||
      !yearOrPassedOut ||
      !department ||
      !domainInOffice ||
      !paidOrUnpaid
    ) {
      console.error("Missing required fields!");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate required documents
    if (!aadhar || !photo || !marksheet) {
      console.error("Missing required documents!");
      return NextResponse.json(
        { error: "Missing required documents (Aadhar, Photo, Marksheet)" },
        { status: 400 }
      );
    }

    // Test Supabase connection
    console.log("Testing Supabase connection...");
    const { data: testData, error: testError } = await supabase
      .from("interns")
      .select("count")
      .limit(1);

    if (testError) {
      console.error("Supabase connection test FAILED:", testError);
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: testError.message,
          hint: "Check if 'interns' table exists in Supabase",
        },
        { status: 500 }
      );
    }
    console.log("Supabase connection successful!");

    // Check if email already exists
    console.log("Checking for existing email...");
    const { data: existingIntern, error: checkError } = await supabase
      .from("interns")
      .select("id")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is what we want
      console.error("Error checking email:", checkError);
    }

    if (existingIntern) {
      console.log("Email already exists!");
      return NextResponse.json(
        { error: "An intern with this email already exists" },
        { status: 409 }
      );
    }

    // Create intern record
    console.log("Creating intern record...");
    const insertData = {
      name,
      email,
      phone_number: phoneNumber,
      college,
      year_or_passed_out: yearOrPassedOut,
      department,
      domain_in_office: domainInOffice,
      paid_or_unpaid: paidOrUnpaid,
      mentor_name: mentorName || null,
    };
    console.log("Insert data:", insertData);

    const { data: newIntern, error: insertError } = await supabase
      .from("interns")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("INSERT ERROR:", JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        {
          error: "Failed to create intern record",
          details: insertError.message,
          hint: insertError.hint,
          code: insertError.code,
          insertData: insertData, // Include what we tried to insert
        },
        { status: 500 }
      );
    }

    if (!newIntern) {
      console.error("No intern data returned after insert!");
      return NextResponse.json(
        { error: "Failed to create intern record - no data returned" },
        { status: 500 }
      );
    }

    console.log("Intern created successfully:", newIntern.id);
    const internId = newIntern.id;

    // Upload documents
    console.log("Starting file uploads...");
    try {
      const aadharPath = await uploadFile(aadhar, internId, "aadhar");
      const photoPath = await uploadFile(photo, internId, "photo");
      const marksheetPath = await uploadFile(marksheet, internId, "marksheet");
      let resumePath = null;

      if (resume) {
        resumePath = await uploadFile(resume, internId, "resume");
      }

      console.log("All files uploaded successfully!");

      // Update intern record with file paths
      console.log("Updating intern with file paths...");
      const { error: updateError } = await supabase
        .from("interns")
        .update({
          aadhar_path: aadharPath,
          photo_path: photoPath,
          marksheet_path: marksheetPath,
          resume_path: resumePath,
        })
        .eq("id", internId);

      if (updateError) {
        console.error("Error updating file paths:", updateError);
        return NextResponse.json(
          {
            error: "Intern created but failed to save document paths",
            internId,
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      console.log("Intern record updated with file paths!");
      console.log("=== POST /api/interns - SUCCESS ===\n");

      return NextResponse.json(
        {
          message: "Intern added successfully",
          intern: {
            ...newIntern,
            aadhar_path: aadharPath,
            photo_path: photoPath,
            marksheet_path: marksheetPath,
            resume_path: resumePath,
          },
        },
        { status: 201 }
      );
    } catch (uploadError) {
      console.error("File upload error:", uploadError);

      // Delete the intern record if file upload fails
      console.log("Rolling back - deleting intern record...");
      await supabase.from("interns").delete().eq("id", internId);

      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : "Failed to upload documents",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("FATAL ERROR in POST /api/interns:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET - Fetch all interns with optional filtering
// GET - Fetch all interns with optional filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const paidOrUnpaid = searchParams.get("paid_or_unpaid");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase.from("interns").select("*", { count: "exact" });

    // Apply filters
    if (status && status !== "All Status") {
      query = query.eq("status", status);
    }

    if (paidOrUnpaid && paidOrUnpaid !== "All") {
      query = query.eq("paid_or_unpaid", paidOrUnpaid);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,college.ilike.%${search}%`
      );
    }

    // Order by created date (newest first)
    query = query.order("created_at", { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: interns, error, count } = await query;

    if (error) {
      console.error("Error fetching interns:", error);
      return NextResponse.json(
        { error: "Failed to fetch interns" },
        { status: 500 }
      );
    }

    // Calculate pagination info
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      interns: interns || [],
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/interns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
