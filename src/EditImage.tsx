import { useMemo, useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { serverConfig } from "digimaker-ui";

import { DME, dmeConfig } from "dmeditor";
import { FetchWithAuth } from "digimaker-ui/util";
import FilerobotImageEditor, {
  TABS,
  TOOLS,
} from "react-filerobot-image-editor";
import { css } from "@emotion/css";

let imageCanvas: HTMLCanvasElement | null = null;

export const EditImage = (props: {
  image: DME.ImageInfo;
  onChange: (imageInfo: DME.ImageInfo) => void;
  config: {
    predefinedRatio?: number;
    lockCropRatio?: boolean;
    imageFolder: number;
  };
}) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const realPath = useMemo(
    () => dmeConfig.general.imagePath(props.image.src),
    [props.image.src]
  );

  const [showOption, setShowOption] = useState(false);

  const saveImage = async (mode: "replace" | "new") => {
    // get image blob
    let imageBlob: Blob | null = null;

    if (!imageCanvas) {
      console.error("Image canvas not found.");
      return;
    }
    imageBlob = await new Promise((resolve) => {
      if (imageCanvas) {
        imageCanvas.toBlob(resolve);
      }
    });

    const formData = new FormData();
    if (!imageBlob) {
      return;
    }
    formData.append("file", imageBlob, "image.jpg");

    //upload to remote
    const resp = await fetch(
      serverConfig.remoteUrl + "/util/uploadfile?service=content",
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadFile = await resp.json();

    let newPath = "";

    // create new or replace.
    if (uploadFile) {
      const uploadFileName = uploadFile.data;

      if (mode === "new") {
        newPath = await saveNewImage(
          uploadFileName,
          "Image " + new Date().toLocaleString()
        );
      } else if (mode === "replace") {
        newPath = await replaceImage(uploadFileName, props.image.src);
      } else {
        return;
      }
    }

    if (newPath) {
      //update data
      props.onChange({
        ...props.image,
        src: dmeConfig.general.imagePath(newPath),
      });
      setOpen(false);
    }
  };

  const saveNewImage = async (path: string, name: string): Promise<string> => {
    const resp = await FetchWithAuth(
      "content/create/image/" + props.config?.imageFolder || 10,
      {
        method: "POST",
        body: JSON.stringify({ name: name, image: path }),
      }
    );

    if (resp) {
      return resp.data.image;
    }
    return "";
  };

  const replaceImage = async (path: string, existing: string) => {
    const data = await FetchWithAuth(
      "content/list/image?field.image=" + existing
    );

    if (data?.data?.count === 1) {
      const id = data.data.list[0].id;
      const respData = await FetchWithAuth("content/update/image/" + id, {
        method: "POST",
        body: JSON.stringify({ image: path }),
      });

      if (respData?.data && respData.error === false) {
        const updatedData = await FetchWithAuth("content/get/image/" + id);
        if (updatedData) {
          return updatedData.data.image;
        }
      }
    }

    return "";
  };

  return (
    <>
      <Button color="info" onClick={handleOpen}>
        Edit
      </Button>
      {open && (
        <Dialog open={open} maxWidth="xl">
          <DialogContent sx={{ p: 0 }}>
            <Dialog open={showOption} onClose={handleClose}>
              <DialogTitle>Save</DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 3 }}>Replace current or save as new image?</Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => saveImage("replace")}
                  >
                    Replace current
                  </Button>
                  <Button variant="outlined" onClick={() => saveImage("new")}>
                    Save as new
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setShowOption(false);
                      imageCanvas = null;
                    }}
                  >
                    Close
                  </Button>
                </Box>
              </DialogContent>
            </Dialog>
            <div
              style={{ width: "60vw", height: "40vw" }}
              className={css`
                .SfxModal-Wrapper,
                .SfxPopper-wrapper {
                  z-index: 2000 !important;
                }
                .kVmiSa.SfxPopper-wrapper {
                  z-index: 2000 !important;
                }
                .FIE_polygon-tool-button,
                .FIE_rectangle-tool-button,
                .FIE_pen-tool-button {
                  display: none;
                }
              `}
            >
              <FilerobotImageEditor
                avoidChangesNotSavedAlertOnLeave={true}
                source={realPath}
                onBeforeSave={(editedImageObject) => {
                  return false;
                }}
                onSave={(editedImageObject) => {
                  imageCanvas = editedImageObject.imageCanvas || null;
                  setShowOption(true);
                }}
                onClose={() => {
                  setOpen(false);
                }}
                annotationsCommon={{
                  fill: "#ff0000",
                }}
                Text={{ text: "Text..." }}
                Rotate={{ angle: 90, componentType: "buttons" }}
                Crop={{
                  ratio: props.config.predefinedRatio || "custom",
                  ratioTitleKey: props.config.predefinedRatio
                    ? "predefined"
                    : "custom",
                  presetsItems: [
                    {
                      titleKey: "predefined",
                      descriptionKey: "predefined",
                      ratio: props.config.predefinedRatio || 4 / 3,
                    },
                    {
                      titleKey: "cinemascope",
                      descriptionKey: "21:9",
                      ratio: 21 / 9,
                    },
                  ],
                  presetsFolders: [],
                }}
                tabsIds={[
                  TABS.ADJUST,
                  TABS.FINETUNE,
                  TABS.FILTERS,
                  TABS.ANNOTATE,
                ]}
                defaultTabId={TABS.ADJUST} // or 'Annotate'
                defaultToolId={TOOLS.CROP} // or 'Text'
                savingPixelRatio={1}
                previewPixelRatio={0.6}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
