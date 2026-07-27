수정 검토 요청:
첫 화면에 기본적으로 보이는 에디터를 main editor 라고 부른다. 앱 해더 오른쪽의 split editor 버튼을 on 해서 오른쪽에 열리는 에디터는 sub editor  라고 부른다.
1. split editor  버튼을 해더의 왼쪽영역으로 이동
2. sub editor 에도 main editor 와 동일하게 view 모드 전환 버튼 추가
3. view 모드상태에서는 에디터 툴바의 오른쪽영역에 view 모드 전용의 기능 버튼이 노출된다. 즉 현재 버튼들(sample, 복사, 붙여넣기, show whitespace, soft wrap, search, commit)은 없어지고 별도의 툴 버튼 셋이 노출된다.
4. view 모드 전용 버튼은 일단 split view (가칭) 토글 기능 버튼하나. split view 를 on 하면 에디터영역을 좌우 분할해서 오른쪽에 view component 를 보여준다. 즉 지금은 editor 를 보거나 view component 를 보거나 둘중 하나인데, split view 버튼을 통해 동시에 볼 수 있게 된다.
5. 위에 설명한 view 모드 추가 기능은 좌우 에디터(왼쪽 main editor, 오른쪽 sub editor) 각각 개별 적용된다. 그래서 만약 split editor on 상태에서 각각 view 모드 + split view on 상태라면 화면에 총 4개의 column 이 보이게 될것이다.(main editor|main editor view mode|sub editor|sub editor view mode)