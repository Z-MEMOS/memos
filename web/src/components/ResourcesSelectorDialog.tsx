import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as utils from "../helpers/utils";
import useLoading from "../hooks/useLoading";
import { editorStateService, resourceService } from "../services";
import { useAppSelector } from "../store";
import Icon from "./Icon";
import toastHelper from "./Toast";
import { generateDialog } from "./Dialog";
import showPreviewImageDialog from "./PreviewImageDialog";
import { Checkbox } from "@mui/joy";
import "../less/resources-selector-dialog.less";

type Props = DialogProps;

interface State {
  checkedArray: boolean[];
}

const ResourcesSelectorDialog: React.FC<Props> = (props: Props) => {
  const { destroy } = props;
  const { t } = useTranslation();
  const loadingState = useLoading();
  const { resources } = useAppSelector((state) => state.resource);
  const editorState = useAppSelector((state) => state.editor);
  const [state, setState] = useState<State>({
    checkedArray: [],
  });

  useEffect(() => {
    resourceService
      .fetchResourceList()
      .catch((error) => {
        console.error(error);
        toastHelper.error(error.response.data.message);
      })
      .finally(() => {
        loadingState.setFinish();
      });
  }, []);

  useEffect(() => {
    setState({
      checkedArray: new Array(resources.length).fill(false),
    });
  }, [resources]);

  const getResourceUrl = useCallback((resource: Resource) => {
    return `${window.location.origin}/o/r/${resource.id}/${resource.filename}`;
  }, []);

  const handlePreviewBtnClick = (resource: Resource) => {
    const resourceUrl = getResourceUrl(resource);
    if (resource.type.startsWith("image")) {
      showPreviewImageDialog(
        resources.filter((r) => r.type.startsWith("image")).map((r) => getResourceUrl(r)),
        resources.findIndex((r) => r.id === resource.id)
      );
    } else {
      window.open(resourceUrl);
    }
  };

  const handleResourceNameOrTypeMouseEnter = useCallback((event: React.MouseEvent, nameOrType: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.className = "usage-detail-container pop-up";
    const bounding = utils.getElementBounding(event.target as HTMLElement);
    tempDiv.style.left = bounding.left + "px";
    tempDiv.style.top = bounding.top - 2 + "px";
    tempDiv.innerHTML = `<span>${nameOrType}</span>`;
    document.body.appendChild(tempDiv);
  }, []);

  const handleResourceNameOrTypeMouseLeave = useCallback(() => {
    document.body.querySelectorAll("div.usage-detail-container.pop-up").forEach((node) => node.remove());
  }, []);

  const handleCheckboxChange = (index: number) => {
    const newCheckedArr = state.checkedArray;
    newCheckedArr[index] = !newCheckedArr[index];
    setState({
      checkedArray: newCheckedArr,
    });
  };

  const handleAddBtnClick = () => {
    const resourceList = resources.filter((_, index) => {
      return state.checkedArray[index];
    });
    editorStateService.setResourceList([...editorState.resourceList, ...resourceList]);
    destroy();
  };

  return (
    <>
      <div className="dialog-header-container">
        <p className="title-text">
          <span className="icon-text">🌄</span>
          {t("sidebar.resources")}
        </p>
        <button className="btn close-btn" onClick={destroy}>
          <Icon.X className="icon-img" />
        </button>
      </div>
      <div className="dialog-content-container">
        {loadingState.isLoading ? (
          <div className="loading-text-container">
            <p className="tip-text">{t("resources.fetching-data")}</p>
          </div>
        ) : (
          <div className="resource-table-container">
            <div className="fields-container">
              <span className="field-text id-text">ID</span>
              <span className="field-text name-text">NAME</span>
              <span></span>
            </div>
            {resources.length === 0 ? (
              <p className="tip-text">{t("resources.no-resources")}</p>
            ) : (
              resources.map((resource, index) => (
                <div key={resource.id} className="resource-container">
                  <span className="field-text id-text">{resource.id}</span>
                  <span className="field-text name-text">
                    <span
                      onMouseEnter={(e) => handleResourceNameOrTypeMouseEnter(e, resource.filename)}
                      onMouseLeave={handleResourceNameOrTypeMouseLeave}
                    >
                      {resource.filename}
                    </span>
                  </span>
                  <div className="flex justify-end">
                    <Icon.Eye
                      className=" text-left text-sm leading-6 px-1 mr-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => handlePreviewBtnClick(resource)}
                    >
                      {t("resources.preview")}
                    </Icon.Eye>
                    <Checkbox checked={state.checkedArray[index]} onChange={() => handleCheckboxChange(index)} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <div className="flex justify-between w-full mt-2 px-2">
          <span className="text-sm font-mono text-gray-500 leading-8">
            {t("message.count-selected-resources")}: {state.checkedArray.filter((checked) => checked).length}
          </span>
          <div className="flex flex-row justify-start items-center">
            <div
              className="text-sm cursor-pointer px-3 py-1 rounded flex flex-row justify-center items-center border border-blue-600 text-blue-600 bg-blue-50 hover:opacity-80"
              onClick={handleAddBtnClick}
            >
              <Icon.PlusSquare className=" w-4 h-auto mr-1" />
              <span>{t("common.add")}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function showResourcesSelectorDialog() {
  generateDialog(
    {
      className: "resources-dialog",
    },
    ResourcesSelectorDialog,
    {}
  );
}
