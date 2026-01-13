// app/api/interns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for file operations
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

  const { data, error } = await supabase.storage
    .from("intern-documents")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true, // Replace if exists
    });

  if (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw new Error(`Failed to upload ${fileType}: ${error.message}`);
  }

  return fileName;
}

// Helper function to delete file from Supabase Storage
async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from("intern-documents")
    .remove([filePath]);

  if (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}

// GET - Fetch single intern by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: internId } = await params;

    console.log("Fetching intern:", internId);

    const { data, error } = await supabase
      .from("interns")
      .select("*")
      .eq("id", internId)
      .single();

    if (error) {
      console.error("Error fetching intern:", error);
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET intern:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update intern (with file upload support)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("\n=== PUT /api/interns/[id] - START ===");

  try {
    const { id } = await params;
    const formData = await request.formData();

    console.log("Updating intern ID:", id);
    console.log("FormData keys:", Array.from(formData.keys()));

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

    // Extract files
    const aadhar = formData.get("aadhar") as File | null;
    const photo = formData.get("photo") as File | null;
    const marksheet = formData.get("marksheet") as File | null;
    const resume = formData.get("resume") as File | null;

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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if intern exists
    const { data: existingIntern, error: fetchError } = await supabase
      .from("interns")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingIntern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    // Check if email is being changed and if it's already taken
    if (email !== existingIntern.email) {
      const { data: emailCheck } = await supabase
        .from("interns")
        .select("id")
        .eq("email", email)
        .neq("id", id)
        .single();

      if (emailCheck) {
        return NextResponse.json(
          { error: "Email is already taken by another intern" },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      phone_number: phoneNumber,
      college,
      year_or_passed_out: yearOrPassedOut,
      department,
      domain_in_office: domainInOffice,
      paid_or_unpaid: paidOrUnpaid,
      mentor_name: mentorName || null,
      updated_at: new Date().toISOString(),
    };

    // Upload new documents if provided and update paths
    if (aadhar) {
      console.log("Uploading new aadhar...");
      const aadharPath = await uploadFile(aadhar, id, "aadhar");
      updateData.aadhar_path = aadharPath;
      // Delete old file if it exists and is different
      if (
        existingIntern.aadhar_path &&
        existingIntern.aadhar_path !== aadharPath
      ) {
        await deleteFile(existingIntern.aadhar_path);
      }
    }

    if (photo) {
      console.log("Uploading new photo...");
      const photoPath = await uploadFile(photo, id, "photo");
      updateData.photo_path = photoPath;
      if (
        existingIntern.photo_path &&
        existingIntern.photo_path !== photoPath
      ) {
        await deleteFile(existingIntern.photo_path);
      }
    }

    if (marksheet) {
      console.log("Uploading new marksheet...");
      const marksheetPath = await uploadFile(marksheet, id, "marksheet");
      updateData.marksheet_path = marksheetPath;
      if (
        existingIntern.marksheet_path &&
        existingIntern.marksheet_path !== marksheetPath
      ) {
        await deleteFile(existingIntern.marksheet_path);
      }
    }

    if (resume) {
      console.log("Uploading new resume...");
      const resumePath = await uploadFile(resume, id, "resume");
      updateData.resume_path = resumePath;
      if (
        existingIntern.resume_path &&
        existingIntern.resume_path !== resumePath
      ) {
        await deleteFile(existingIntern.resume_path);
      }
    }

    // Update intern record in database
    const { data: updatedIntern, error: updateError } = await supabase
      .from("interns")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update intern", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("Intern updated successfully");
    console.log("=== PUT /api/interns/[id] - SUCCESS ===\n");

    return NextResponse.json({
      message: "Intern updated successfully",
      intern: updatedIntern,
    });
  } catch (error) {
    console.error("Error in PUT /api/interns/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete intern and their documents
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("\n=== DELETE /api/interns/[id] - START ===");

  try {
    const { id: internId } = await params;
    console.log("Deleting intern:", internId);

    // Fetch intern to get document paths before deletion
    const { data: intern, error: fetchError } = await supabase
      .from("interns")
      .select("*")
      .eq("id", internId)
      .single();

    if (fetchError || !intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    // Collect all file paths to delete
    const filesToDelete: string[] = [];
    if (intern.aadhar_path) filesToDelete.push(intern.aadhar_path);
    if (intern.photo_path) filesToDelete.push(intern.photo_path);
    if (intern.marksheet_path) filesToDelete.push(intern.marksheet_path);
    if (intern.resume_path) filesToDelete.push(intern.resume_path);

    // Delete all documents from storage
    if (filesToDelete.length > 0) {
      console.log("Deleting files from storage:", filesToDelete);
      const { error: storageError } = await supabase.storage
        .from("intern-documents")
        .remove(filesToDelete);

      if (storageError) {
        console.error("Error deleting files from storage:", storageError);
        // Continue with database deletion even if file deletion fails
      } else {
        console.log("Files deleted successfully");
      }
    }

    // Delete intern record from database
    const { error: deleteError } = await supabase
      .from("interns")
      .delete()
      .eq("id", internId);

    if (deleteError) {
      console.error("Error deleting intern from database:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete intern", details: deleteError.message },
        { status: 500 }
      );
    }

    console.log("Intern deleted successfully from database");
    console.log("=== DELETE /api/interns/[id] - SUCCESS ===\n");

    return NextResponse.json({
      message: "Intern deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE intern:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
