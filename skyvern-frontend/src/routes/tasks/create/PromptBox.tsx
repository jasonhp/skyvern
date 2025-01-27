import { getClient } from "@/api/AxiosClient";
import { ObserverTask, TaskGenerationApiResponse } from "@/api/types";
import img from "@/assets/promptBoxBg.png";
import { AutoResizingTextarea } from "@/components/AutoResizingTextarea/AutoResizingTextarea";
import { CartIcon } from "@/components/icons/CartIcon";
import { GraphIcon } from "@/components/icons/GraphIcon";
import { InboxIcon } from "@/components/icons/InboxIcon";
import { MessageIcon } from "@/components/icons/MessageIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { Button } from "@/components/ui/button";
import {
  CustomSelectItem,
  Select,
  SelectContent,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useCredentialGetter } from "@/hooks/useCredentialGetter";
import {
  FileTextIcon,
  GearIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ToastAction } from "@radix-ui/react-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { stringify as convertToYAML } from "yaml";
import {
  generatePhoneNumber,
  generateUniqueEmail,
} from "../data/sampleTaskData";
import { ExampleCasePill } from "./ExampleCasePill";

function createTemplateTaskFromTaskGenerationParameters(
  values: TaskGenerationApiResponse,
) {
  return {
    title: values.suggested_title ?? "Untitled Task",
    description: "",
    is_saved_task: true,
    webhook_callback_url: null,
    proxy_location: "RESIDENTIAL",
    workflow_definition: {
      parameters: [
        {
          parameter_type: "workflow",
          workflow_parameter_type: "json",
          key: "navigation_payload",
          default_value: JSON.stringify(values.navigation_payload),
        },
      ],
      blocks: [
        {
          block_type: "task",
          label: values.suggested_title ?? "Untitled Task",
          url: values.url,
          navigation_goal: values.navigation_goal,
          data_extraction_goal: values.data_extraction_goal,
          data_schema: values.extracted_information_schema,
        },
      ],
    },
  };
}

const exampleCases = [
  {
    key: "finditparts",
    label: "Add a product to cart",
    prompt:
      'Go to https://www.finditparts.com first. Search for the product "W01-377-8537", add it to cart and then navigate to the cart page. Your goal is COMPLETE when you\'re on the cart page and the specified product is in the cart. Extract all product quantity information from the cart page. Do not attempt to checkout.',
    icon: <CartIcon className="size-6" />,
  },
  {
    key: "job_application",
    label: "Apply for a job",
    prompt: `Go to https://jobs.lever.co/leverdemo-8/45d39614-464a-4b62-a5cd-8683ce4fb80a/apply, fill out the job application form and apply to the job. Fill out any public burden questions if they appear in the form. Your goal is complete when the page says you've successfully applied to the job. Terminate if you are unable to apply successfully. Here's the user information: {"name":"John Doe","email":"${generateUniqueEmail()}","phone":"${generatePhoneNumber()}","resume_url":"https://writing.colostate.edu/guides/documents/resume/functionalSample.pdf","cover_letter":"Generate a compelling cover letter for me"}`,
    icon: <InboxIcon className="size-6" />,
  },
  {
    key: "geico",
    label: "Get an insurance quote",
    prompt: `Go to https://www.geico.com first. Navigate through the website until you generate an auto insurance quote. Do not generate a home insurance quote. If you're on a page showing an auto insurance quote (with premium amounts), your goal is COMPLETE. Extract all quote information in JSON format including the premium amount, the timeframe for the quote. {"nameform":"work_data","login_admin":"noteadm","login":"user","passw":"password","mode":"flat","mode_data":[{"flat_data":{"unique_start":"1516966548.648839","flat_on_stage_id":33,"flat_status_id":4,"retry_count":3,"time_start":"2017-01-26 15:51:18","duration":70,"gps_start":"GPS","gps_end":"GPS","audio_info":"35","photo_flat":"ph_1516966548_fl_hRd8dpz"},"quizer_data":{"argessive":0,"registration":1,"take_apm":0,"request":1,"live_in_flat":3,"first_vote":1,"will_vote":1,"home_vote":0,"rf":1}}]}`,
    icon: <FileTextIcon className="size-6" />,
  },
  {
    key: "california_edd",
    label: "Fill out CA's online EDD",
    prompt: `Go to https://eddservices.edd.ca.gov/acctservices/AccountManagement/AccountServlet?Command=NEW_SIGN_UP. Navigate through the employer services online enrollment form. Terminate when the form is completed. Here's the needed information: {"username":"isthisreal1","password":"Password123!","first_name":"John","last_name":"Doe","pin":"1234","email":"${generateUniqueEmail()}","phone_number":"${generatePhoneNumber()}"}`,
    icon: <Pencil1Icon className="size-6" />,
  },
  {
    key: "contact_us_forms",
    label: "Fill a contact us form",
    prompt: `Go to https://canadahvac.com/contact-hvac-canada. Fill out the contact us form and submit it. Your goal is complete when the page says your message has been sent. Here's the user information: {"name":"John Doe","email":"john.doe@gmail.com","phone":"123-456-7890","message":"Hello, I have a question about your services."}`,
    icon: <FileTextIcon className="size-6" />,
  },
  {
    key: "hackernews",
    label: "What's the top post on hackernews",
    prompt: "Navigate to the Hacker News homepage and get the top 3 posts.",
    icon: <MessageIcon className="size-6" />,
  },
  {
    key: "AAPLStockPrice",
    label: "Search for AAPL on Google Finance",
    prompt:
      'Go to google finance and find the "AAPL" stock price. COMPLETE when the search results for "AAPL" are displayed and the stock price is extracted.',
    icon: <GraphIcon className="size-6" />,
  },
  {
    key: "topRankedFootballTeam",
    label: "Get the top ranked football team",
    prompt:
      "Navigate to the FIFA World Ranking page and identify the top ranked football team. Extract the name of the top ranked football team from the FIFA World Ranking page.",
    icon: <TrophyIcon className="size-6" />,
  },
  {
    key: "extractIntegrationsFromGong",
    label: "Extract Integrations from Gong.io",
    prompt:
      "Go to https://www.gong.io first. Navigate to the 'Integrations' page on the Gong website. Extract the names and descriptions of all integrations listed on the Gong integrations page. Ensure not to click on any external links or advertisements.",
    icon: <GearIcon className="size-6" />,
  },
];

function PromptBox() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<string>("");
  const [selectValue, setSelectValue] = useState<"v1" | "v2">("v2"); // Observer is the default
  const credentialGetter = useCredentialGetter();
  const queryClient = useQueryClient();

  const startObserverCruiseMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const client = await getClient(credentialGetter, "v2");
      return client.post<{ user_prompt: string }, { data: ObserverTask }>(
        "/tasks",
        { user_prompt: prompt },
      );
    },
    onSuccess: (response) => {
      toast({
        variant: "success",
        title: "Workflow Run Created",
        description: `Workflow run created successfully.`,
        action: (
          <ToastAction altText="View">
            <Button asChild>
              <Link
                to={`/workflows/${response.data.workflow_permanent_id}/${response.data.workflow_run_id}`}
              >
                View
              </Link>
            </Button>
          </ToastAction>
        ),
      });
      queryClient.invalidateQueries({
        queryKey: ["workflowRuns"],
      });
      queryClient.invalidateQueries({
        queryKey: ["workflows"],
      });
    },
    onError: (error: AxiosError) => {
      toast({
        variant: "destructive",
        title: "Error creating workflow run from prompt",
        description: error.message,
      });
    },
  });

  const getTaskFromPromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const client = await getClient(credentialGetter);
      return client
        .post<
          { prompt: string },
          { data: TaskGenerationApiResponse }
        >("/generate/task", { prompt })
        .then((response) => response.data);
    },
    onError: (error: AxiosError) => {
      toast({
        variant: "destructive",
        title: "Error creating task from prompt",
        description: error.message,
      });
    },
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (params: TaskGenerationApiResponse) => {
      const client = await getClient(credentialGetter);
      const templateTask =
        createTemplateTaskFromTaskGenerationParameters(params);
      const yaml = convertToYAML(templateTask);
      return client.post("/workflows", yaml, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["savedTasks"],
      });
    },
    onError: (error: AxiosError) => {
      toast({
        variant: "destructive",
        title: "Error saving task",
        description: error.message,
      });
    },
  });

  return (
    <div>
      <div
        className="rounded-sm py-[4.25rem]"
        style={{
          background: `url(${img}) 50% / cover no-repeat`,
        }}
      >
        <div className="mx-auto flex min-w-44 flex-col items-center gap-7 px-8">
          <span className="text-2xl">
            What task would you like to accomplish?
          </span>
          <div className="flex w-full max-w-xl items-center rounded-xl bg-slate-700 py-2 pr-4 lg:w-3/4">
            <AutoResizingTextarea
              className="min-h-0 resize-none rounded-xl border-transparent px-4 hover:border-transparent focus-visible:ring-0"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt..."
            />
            <Select
              value={selectValue}
              onValueChange={(value: "v1" | "v2") => {
                setSelectValue(value);
              }}
            >
              <SelectTrigger className="w-48 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-500 bg-slate-elevation3">
                <CustomSelectItem value="v1">
                  <div className="space-y-2">
                    <div>
                      <SelectItemText>Skyvern 1.0</SelectItemText>
                    </div>
                    <div className="text-xs text-slate-400">
                      Best for simple tasks
                    </div>
                  </div>
                </CustomSelectItem>
                <CustomSelectItem value="v2" className="hover:bg-slate-800">
                  <div className="space-y-2">
                    <div>
                      <SelectItemText>Skyvern 2.0</SelectItemText>
                    </div>
                    <div className="text-xs text-slate-400">
                      Best for complex tasks
                    </div>
                  </div>
                </CustomSelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center">
              {startObserverCruiseMutation.isPending ||
              getTaskFromPromptMutation.isPending ||
              saveTaskMutation.isPending ? (
                <ReloadIcon className="h-6 w-6 animate-spin" />
              ) : (
                <PaperPlaneIcon
                  className="h-6 w-6 cursor-pointer"
                  onClick={async () => {
                    if (selectValue === "v2") {
                      startObserverCruiseMutation.mutate(prompt);
                      return;
                    }
                    const taskGenerationResponse =
                      await getTaskFromPromptMutation.mutateAsync(prompt);
                    await saveTaskMutation.mutateAsync(taskGenerationResponse);
                    navigate("/tasks/create/from-prompt", {
                      state: {
                        data: taskGenerationResponse,
                      },
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 rounded-sm bg-slate-elevation1 p-4">
        <div
          className="flex cursor-pointer gap-2 whitespace-normal rounded-sm border-2 border-dashed bg-slate-elevation3 px-4 py-3 hover:bg-slate-elevation5 lg:whitespace-nowrap"
          onClick={() => {
            navigate("/tasks/create/blank");
          }}
        >
          <PlusIcon className="size-6" />
          Build Your Own
        </div>
        {exampleCases.map((example) => {
          return (
            <ExampleCasePill
              key={example.key}
              exampleId={example.key}
              icon={example.icon}
              label={example.label}
              prompt={example.prompt}
              version={selectValue}
            />
          );
        })}
      </div>
    </div>
  );
}

export { PromptBox };
