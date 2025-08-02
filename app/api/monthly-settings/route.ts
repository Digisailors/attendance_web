// app/api/monthly-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'





// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Create monthly_settings table if it doesn't exist
async function ensureMonthlySettingsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.monthly_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      month integer NOT NULL,
      year integer NOT NULL,
      total_days integer NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT monthly_settings_month_year_key UNIQUE (month, year)
    );
    
    -- Disable RLS for this table or create appropriate policies
    ALTER TABLE public.monthly_settings DISABLE ROW LEVEL SECURITY;
    
    -- Grant permissions
    GRANT ALL ON public.monthly_settings TO authenticated;
    GRANT ALL ON public.monthly_settings TO anon;
    GRANT ALL ON public.monthly_settings TO service_role;
  `

  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: createTableQuery
  })

  if (error) {
    console.log('Table setup error:', error.message)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    );

    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const formattedMonth = month.padStart(2, "0");
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-31`;
const { data, error } = await supabaseAdmin
  .from("attendance")
  .select("working_days")
  .eq("month", parseInt(month))
  .eq("year", parseInt(year));

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

const totalWorkingDays = data.reduce((sum, row) => sum + (row.working_days || 0), 0);
return NextResponse.json({ workingDays: totalWorkingDays });


    return NextResponse.json({ workingDays: totalWorkingDays });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}




export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { month, year, totalDays } = body

    console.log('Updating monthly settings:', { month, year, totalDays })

    // Validate input
    if (!month || !year || !totalDays) {
      return NextResponse.json(
        { error: 'Month, year, and totalDays are required' },
        { status: 400 }
      )
    }

    if (totalDays < 1 || totalDays > 31) {
      return NextResponse.json(
        { error: 'Total days must be between 1 and 31' },
        { status: 400 }
      )
    }

    // Ensure table exists first
    await ensureMonthlySettingsTable()

    // Use admin client to bypass RLS
    const { data: settings, error: upsertError } = await supabaseAdmin
      .from('monthly_settings')
      .upsert({
        month,
        year,
        total_days: totalDays,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'month,year'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting monthly settings:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Update all attendance records for this month/year using admin client
    const { error: updateError } = await supabaseAdmin
      .from('attendance')
      .update({ total_days: totalDays })
      .eq('month', month)
      .eq('year', year)

    if (updateError) {
      console.error('Error updating attendance records:', updateError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      month,
      year,
      totalDays
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}