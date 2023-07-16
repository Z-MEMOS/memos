import * as api from "@/helpers/api";
import { DEFAULT_MEMO_LIMIT } from "@/helpers/consts";
import store, { useAppSelector } from "../";
import { patchResource, setResources, deleteResource, upsertResources } from "../reducer/resource";
import { useGlobalStore } from "./global";
import { AxiosResponse } from "axios";
import { useTranslate } from "@/utils/i18n";

const convertResponseModelResource = (resource: Resource): Resource => {
  return {
    ...resource,
    createdTs: resource.createdTs * 1000,
    updatedTs: resource.updatedTs * 1000,
  };
};

export const useResourceStore = () => {
  const state = useAppSelector((state) => state.resource);
  const t = useTranslate();
  const globalStore = useGlobalStore();
  const maxUploadSizeMiB = globalStore.state.systemStatus.maxUploadSizeMiB;

  return {
    state,
    getState: () => {
      return store.getState().resource;
    },
    async fetchResourceList(): Promise<Resource[]> {
      const { data } = await api.getResourceList();
      const resourceList = data.map((m) => convertResponseModelResource(m));
      store.dispatch(setResources(resourceList));
      return resourceList;
    },
    async fetchResourceListWithLimit(limit = DEFAULT_MEMO_LIMIT, offset?: number): Promise<Resource[]> {
      const resourceFind: ResourceFind = {
        limit,
        offset,
      };
      const { data } = await api.getResourceListWithLimit(resourceFind);
      const resourceList = data.map((m) => convertResponseModelResource(m));
      store.dispatch(upsertResources(resourceList));
      return resourceList;
    },
    async createResource(resourceCreate: ResourceCreate): Promise<Resource> {
      const { data } = await api.createResource(resourceCreate);
      const resource = convertResponseModelResource(data);
      const resourceList = state.resources;
      store.dispatch(setResources([resource, ...resourceList]));
      return resource;
    },
    async createResourceWithBlob(file: File, progressCallback: (progress: number) => void): Promise<Resource> {
      const { name: filename, size } = file;
      if (size > maxUploadSizeMiB * 1024 * 1024) {
        return Promise.reject(t("message.maximum-upload-size-is", { size: maxUploadSizeMiB }));
      }

      const formData = new FormData();
      formData.append("file", file, filename);
      return new Promise((resolve, reject) => {
        api
          .createResourceWithBlob(formData, (progress) => {
            progressCallback(progress);
          })
          .then((response: AxiosResponse<Resource>) => {
            const data = response.data;
            const resource = convertResponseModelResource(data);
            const resourceList = state.resources;
            store.dispatch(setResources([resource, ...resourceList]));
            resolve(resource);
          })
          .catch((error) => {
            reject(error);
          });
      });
    },
    async createResourcesWithBlob(
      files: FileList,
      progressCallback: (progress: number, filename: string) => void
    ): Promise<Array<Resource>> {
      let newResourceList: Array<Resource> = [];
      const totalFiles = files.length;
      let completedFiles = 0;
      for (const file of files) {
        const { name: filename, size } = file;
        if (size > maxUploadSizeMiB * 1024 * 1024) {
          return Promise.reject(t("message.file-exceeds-upload-limit-of", { file: filename, size: maxUploadSizeMiB }));
        }

        const formData = new FormData();
        formData.append("file", file, filename);
        const resource = await new Promise<Resource>((resolve, reject) => {
          api
            .createResourceWithBlob(formData, (progress) => {
              const fileProgress = (progress / 100) * (1 / totalFiles);
              const overallProgress = (completedFiles + fileProgress) * 100;
              progressCallback(overallProgress, filename);
            })
            .then((response) => {
              const data = response.data;
              const resource = convertResponseModelResource(data);
              completedFiles++;
              resolve(resource);
            })
            .catch((error) => {
              console.error(error);
              reject(error);
            });
        });
        newResourceList = [resource, ...newResourceList];
      }
      const resourceList = state.resources;
      store.dispatch(setResources([...newResourceList, ...resourceList]));
      return newResourceList;
    },
    async deleteResourceById(id: ResourceId) {
      await api.deleteResourceById(id);
      store.dispatch(deleteResource(id));
    },
    async patchResource(resourcePatch: ResourcePatch): Promise<Resource> {
      const { data } = await api.patchResource(resourcePatch);
      const resource = convertResponseModelResource(data);
      store.dispatch(patchResource(resource));
      return resource;
    },
  };
};
