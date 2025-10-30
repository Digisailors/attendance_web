// app/api/interns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch single intern by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const internId = params.id;

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


// PUT - Update intern
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Extract fields that can be updated
    const {
      name,
      email,
      phone_number,
      college,
      year_or_passed_out,
      department,
      domain_in_office,
      paid_or_unpaid,
      status,
    } = body;

    // Check if intern exists
    const { data: existingIntern } = await supabase
      .from("interns")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingIntern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    // If email is being changed, check if new email already exists
    if (email) {
      const { data: emailExists } = await supabase
        .from("interns")
        .select("id")
        .eq("email", email)
        .neq("id", id)
        .single();

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use by another intern" },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (college !== undefined) updateData.college = college;
    if (year_or_passed_out !== undefined)
      updateData.year_or_passed_out = year_or_passed_out;
    if (department !== undefined) updateData.department = department;
    if (domain_in_office !== undefined)
      updateData.domain_in_office = domain_in_office;
    if (paid_or_unpaid !== undefined)
      updateData.paid_or_unpaid = paid_or_unpaid;
    if (status !== undefined) updateData.status = status;

    // Update intern
    const { data: updatedIntern, error } = await supabase
      .from("interns")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating intern:", error);
      return NextResponse.json(
        { error: "Failed to update intern" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Intern updated successfully",
      intern: updatedIntern,
    });
  } catch (error) {
    console.error("Error in PUT /api/interns/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete intern and their documents
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const internId = params.id;

    console.log("Deleting intern:", internId);

    const { error } = await supabase
      .from("interns")
      .delete()
      .eq("id", internId);

    if (error) {
      console.error("Error deleting intern:", error);
      return NextResponse.json(
        { error: "Failed to delete intern" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Intern deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE intern:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
