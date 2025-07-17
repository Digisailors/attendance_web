import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recipientType = searchParams.get('recipientType')
    const recipientId = searchParams.get('recipientId')
    const isRead = searchParams.get('isRead')
    const limit = searchParams.get('limit')

    if (!recipientType || !recipientId) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientType, recipientId' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_type', recipientType)
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true')
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('Error in GET notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, isRead, recipientType, recipientId } = body

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing required field: notificationId' },
        { status: 400 }
      )
    }

    // If updating a single notification
    if (notificationId !== 'all') {
      const { data: updatedNotification, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: isRead })
        .eq('id', notificationId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating notification:', updateError)
        return NextResponse.json(
          { error: 'Failed to update notification' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Notification updated successfully',
        data: updatedNotification
      })
    }

    // If marking all notifications as read
    if (notificationId === 'all' && recipientType && recipientId) {
      const { data: updatedNotifications, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_type', recipientType)
        .eq('recipient_id', recipientId)
        .eq('is_read', false)
        .select()

      if (updateError) {
        console.error('Error updating all notifications:', updateError)
        return NextResponse.json(
          { error: 'Failed to update all notifications' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'All notifications marked as read',
        data: updatedNotifications
      })
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in PATCH notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('notificationId')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing required field: notificationId' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (deleteError) {
      console.error('Error deleting notification:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}