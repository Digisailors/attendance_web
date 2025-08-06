import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Validation schema
const schema = z.object({
  employee_id: z.string(),
  ot_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  reason: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Files
    const image1File = formData.get('image1');
    const image2File = formData.get('image2');
    const image1 = image1File instanceof File ? image1File : null;
    const image2 = image2File instanceof File ? image2File : null;

    // Payload
    const payload = {
      employee_id: formData.get('employee_id') as string, // Already UUID
      ot_date: formData.get('ot_date') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      reason: formData.get('reason') as string,
    };

    // Validate
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { employee_id, ot_date, reason } = parsed.data;

const formatToTime = (datetimeStr: string) => {
  const date = new Date(datetimeStr);
  return date.toTimeString().split(' ')[0]; // "HH:MM:SS"
};

const start_time = formatToTime(payload.start_time);
const end_time = formatToTime(payload.end_time);


    // ✅ No need to fetch UUID again — it's already passed from frontend
    const ot_id = uuidv4();

    // Helper to upload image
   const uploadImage = async (file: File | null, label: string) => {
  if (!file) return null;
  const ext = file.name.split('.').pop();
  const path = `ot/${ot_id}_${label}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('ot-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(`${label} upload failed: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage
    .from('ot-images')
    .getPublicUrl(path);

  return publicUrlData?.publicUrl ?? null;
};


    // Upload both images
    const image1_url = await uploadImage(image1, 'img1');
    const image2_url = await uploadImage(image2, 'img2');

    // Insert into overtime_requests table
    const { error: insertError } = await supabase.from('overtime_requests').insert([
      {
        id: ot_id,
        employee_id, // UUID directly from frontend
        ot_date,
        start_time,
        end_time,
        reason,
        image1: image1_url,
        image2: image2_url,
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to insert OT request', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ot_id,
      image1_url,
      image2_url,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err.message);
    return NextResponse.json(
      { error: 'Unexpected server error', details: err.message },
      { status: 500 }
    );
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employee_id = searchParams.get('employee_id');

    let query = supabase
      .from('overtime_requests')
      .select(`
        *,
        employees!overtime_requests_employee_id_fkey(name)
      `)
      .order('ot_date', { ascending: false });

    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch OT requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approved_by } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'id and status are required' },
        { status: 400 }
      );
    }

    // Validate UUID format for approved_by if it's provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (approved_by && !uuidRegex.test(approved_by)) {
      return NextResponse.json(
        { error: 'Invalid approved_by format', details: 'approved_by must be a valid UUID' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('overtime_requests')
      .update({
        status,
        approved_by,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update status', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Status updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
