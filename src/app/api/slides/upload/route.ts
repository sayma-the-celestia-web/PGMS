import { NextRequest, NextResponse } from "next/server";
import { uploadSlideToCloudinary, MAX_SLIDE_FILE_SIZE_BYTES, ALLOWED_SLIDE_EXTENSIONS } from "@/lib/cloudinary";
import { DataService } from "@/lib/services/data-service";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const teamId = formData.get("teamId") as string | null;
    const slideLink = (formData.get("slideLink") as string | null) || undefined;
    const file = formData.get("file") as File | null;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Team ID is required." },
        { status: 400 }
      );
    }

    let slideFileUrl: string | undefined = undefined;
    let slideFileName: string | undefined = undefined;

    if (file && file.size > 0) {
      // Validate file size (15 MB limit)
      if (file.size > MAX_SLIDE_FILE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          {
            success: false,
            error: `File size (${sizeMb} MB) exceeds the 15 MB maximum limit. Please compress your slides or upload a file under 15 MB.`,
          },
          { status: 400 }
        );
      }

      // Validate file extension
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_SLIDE_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file extension "${ext}". Only PDF (.pdf) and PowerPoint (.pptx) presentations are allowed.`,
          },
          { status: 400 }
        );
      }

      // Upload file buffer to Cloudinary
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await uploadSlideToCloudinary(buffer, file.name, teamId);
      slideFileUrl = uploadResult.url;
      slideFileName = file.name;
    }

    // Update team slides in DataService
    const updatedTeam = await DataService.updateTeamSlides(teamId, {
      slide_link: slideLink,
      slide_file_name: slideFileName,
      slide_file_url: slideFileUrl,
    });

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      fileUrl: slideFileUrl || updatedTeam.slide_file_url,
      fileName: slideFileName || updatedTeam.slide_file_name,
    });
  } catch (error: any) {
    console.error("Slides upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to process and upload presentation slides.",
      },
      { status: 500 }
    );
  }
}
